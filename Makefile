# ==============================================================================
# .envrc file
#
# export DB_PASSWORD=
# export DB_USER=
# export DB_NAME=
# export DB_HOST=
# export DB_PORT=
# export DB_SSLMODE=
# export DB_DSN=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}
#
# export SMTP_HOSTNAME=
# export SMTP_PORT=
# export SMTP_USERNAME=
# export SMTP_PASSWORD=

include .envrc

# ==============================================================================
# Go Installation
#
#	You need to have Go version >= 1.24 to run this code.

# ==============================================================================
# Node Installation & Browsers
# 
#	You need to have Node.js version 18+ or 20+.
#
#	Chrome  >=87
#	Firefox >=78
#	Safari  >=14
#	Edge    >=88

# ==============================================================================
# Install Tooling and Dependencies
#
#	This project uses Docker and it is expected to be installed.
#	gcc is also expected to be installed.

# ==============================================================================
# Define dependencies

GOLANG   := golang:1.24
ALPINE   := alpine:3.21
POSTGRES := postgres:17.5
NODE     := node:24-slim
MAILHOG  := mailhog/mailhog:v1.0.1

VERSION   := 0.0.1
BIP_IMAGE := localhost/bip:$(VERSION)

export VITE_VERSION := $(VERSION)
	
# ==================================================================================== #
# HELPERS
# ==================================================================================== #

## help: print this help message
.PHONY: help
help:
	@echo 'Usage:'
	@sed -n 's/^##//p' Makefile | column -t -s ':' |  sed -e 's/^/ /'

.PHONY: confirm
confirm:
	@echo -n 'Are you sure? [y/N] ' && read ans && [ $${ans:-N} = y ]

# ==================================================================================== #
# DEVELOPMENT
# ==================================================================================== #

## dev/gotooling: install Go tooling for development
.PHONY: dev/gotooling
dev/gotooling:
	 go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	 go install github.com/rakyll/hey@latest
	 go install github.com/divan/expvarmon@latest
	 go install honnef.co/go/tools/cmd/staticcheck@latest
	 go install golang.org/x/vuln/cmd/govulncheck@latest

## dev/docker: pull all required Docker images for development
.PHONY: dev/docker
dev/docker:
	docker pull $(GOLANG) & \
	docker pull $(ALPINE) & \
	docker pull $(POSTGRES) & \
	docker pull $(NODE) & \
	docker pull $(MAILHOG) & \
	wait;

## docker/build: build the Docker image for the application
.PHONY: docker/build
docker/build:
	docker build \
		-f zarf/docker/dockerfile.bip \
		-t $(BIP_IMAGE) \
		--build-arg BUILD_REF=$(VERSION) \
		--build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
		.

## compose/up: start the Docker Compose services
.PHONY: compose/up
compose/up:
	cd ./zarf/compose/ && docker compose -f docker_compose.yaml -p bip up -d

## compose/build-up: build the Docker image and start the services
.PHONY: compose/build-up
compose/build-up: docker-build compose-up

## compose/down: stop and remove the Docker Compose services
.PHONY: compose/down
compose/down:
	cd ./zarf/compose/ && docker compose -f docker_compose.yaml -p bip down

## compose/logs: view the logs of the Docker Compose services
.PHONY: compose/logs
compose/logs:
	cd ./zarf/compose/ && docker compose -f docker_compose.yaml -p bip logs

## run/help: list the command-line flags options
.PHONY: run/help
run/help:
	go run ./cmd/api -help

## run/api: run the cmd/api application
.PHONY: run/api
run/api:
	@go run ./cmd/api -limiter-enabled=false -db-dsn=$(DB_DSN)

## run/metrics: run the TermUI monitor for the application
.PHONY: run/metrics
run/metrics:
	expvarmon -ports="localhost:4000" -endpoint="/v1/metrics" -i=5s \
	-vars="str:version,goroutines,total_requests_received,total_responses_sent,in_flight_requests,duration:total_processing_time_μs,\
	str:database.MaxOpenConnections,database.OpenConnections,database.InUse,database.Idle,database.WaitCount,duration:database.WaitDuration,database.MaxIdleTimeClosed,\
	mem:memstats.HeapAlloc,mem:memstats.HeapSys,mem:memstats.Sys"

## run/load email=$1 password=$2: run a load test against the API
.PHONY: run/load
run/load: confirm
	hey -c 50 -n 700 -d '{"email": "$(email)", "password": "$(password)"}' -m "POST" http://localhost:4000/v1/tokens/authentication

## db/migrations/new name=$1: create a new database migration
.PHONY: db/migrations/new
db/migrations/new:
	migrate create -seq -ext=.sql -dir=./migrations -digits 3 $(name)

## db/migrations/up: apply all up database migrations
.PHONY: db/migrations/up
db/migrations/up: confirm
	migrate -path ./migrations -database $(DB_DSN) up

# ==================================================================================== #
# QUALITY CONTROL
# ==================================================================================== #

## tidy: tidy, vendor module dependencies and format all .go files
.PHONY: tidy
tidy:
	go mod tidy
	go mod verify
	go mod vendor
	go fmt ./...

## audit: run quality control checks
.PHONY: audit
audit:
	go mod tidy -diff
	go mod verify
	CGO_ENABLED=0 go vet ./...
	staticcheck -checks=all ./...
	govulncheck ./...
#	CGO_ENABLED=1 go test -race -count=1 ./...

# ==================================================================================== #
# BUILD
# ==================================================================================== #

## build/api: build the cmd/api application
.PHONY: build/api
build/api:
	go build -ldflags='-s' -o=./bin/api ./cmd/api
	GOOS=linux GOARCH=amd64 go build -ldflags='-s' -o=./bin/linux_amd64/api ./cmd/api
