# ==============================================================================
# .envrc file
#
# export DB_DSN=
#
# export SMTP_HOST=
# export SMTP_PORT=
# export SMTP_USERNAME=
# export SMTP_PASSWORD=
# export SMTP_SENDER=
#
# export S3_ENDPOINT=
# export S3_ACCESS_KEY=
# export S3_SECRET_KEY=
# export S3_SECURE=
# export S3_REGION=
# export S3_BUCKET=
# export S3_BASE_URL=

include .envrc

# ==============================================================================
# Go Installation
#
#	You need to have Go version >= 1.24 to run this code.

# ==============================================================================
# Node Installation & Browsers
# 
#	You need to have Node.js version >= 24.2.0 and pnpm version 10.12.1
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

GOLANG     := golang:1.24
ALPINE     := alpine:3.22
POSTGRES   := postgres:17.5
NODE       := node:24-slim
MAILHOG    := mailhog/mailhog:v1.0.1
MINIO      := minio/minio:RELEASE.2025-04-22T22-12-26Z
BIPC_IMAGE := localhost/bipc:latest
	
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
	 go install honnef.co/go/tools/cmd/staticcheck@latest
	 go install golang.org/x/vuln/cmd/govulncheck@latest
	 go install github.com/minio/mc@latest

## dev/docker: pull all required Docker images for development
.PHONY: dev/docker
dev/docker:
	docker pull $(GOLANG) & \
	docker pull $(ALPINE) & \
	docker pull $(POSTGRES) & \
	docker pull $(NODE) & \
	docker pull $(MAILHOG) & \
	docker pull $(MINIO) & \
	wait;

## docker/build: build the Docker image for the application
.PHONY: docker/build
docker/build:
	docker build \
		-f zarf/docker/dockerfile.bipc \
		-t $(BIPC_IMAGE) \
		.

## compose/up: start the Docker Compose services
.PHONY: compose/up
compose/up:
	cd ./zarf/compose/ && docker compose -f docker_compose.yaml -p bipc up -d

## compose/build-up: build the Docker image and start the services
.PHONY: compose/build-up
compose/build-up: docker/build compose/up

## compose/down: stop and remove the Docker Compose services
.PHONY: compose/down
compose/down:
	cd ./zarf/compose/ && docker compose -f docker_compose.yaml -p bipc down

## compose/logs: view the logs of the Docker Compose services
.PHONY: compose/logs
compose/logs:
	cd ./zarf/compose/ && docker compose -f docker_compose.yaml -p bipc logs

## run/help: list the command-line flags options
.PHONY: run/help
run/help:
	go run ./cmd/api -help

## run/api: run the cmd/api application
.PHONY: run/api
run/api:
	go run ./cmd/api -limiter-enabled=false -db-dsn=$(DB_DSN) \
	-smtp-host=$(SMTP_HOST) -smtp-port=$(SMTP_PORT) -smtp-username=$(SMTP_USERNAME) -smtp-password=$(SMTP_PASSWORD) -smtp-sender=$(SMTP_SENDER) \
	-s3-endpoint=$(S3_ENDPOINT) -s3-access-key=$(S3_ACCESS_KEY) -s3-secret-key=$(S3_SECRET_KEY) -s3-secure=$(S3_SECURE) -s3-region=$(S3_REGION) -s3-bucket=$(S3_BUCKET) -s3-base-url=$(S3_BASE_URL)

## migrations/new name=$1: create a new database migration
.PHONY: migrations/new
migrations/new:
	migrate create -seq -ext=.sql -dir=./migrations -digits 3 $(name)

## migrations/up: apply all up database migrations
.PHONY: migrations/up
migrations/up: confirm
	migrate -path ./migrations -database $(DB_DSN) up

## migrations/down: apply all down database migrations
.PHONY: migrations/down
migrations/down:
	migrate -path ./migrations -database $(DB_DSN) down

## minio/local: setup MinIO local storage
.PHONY: minio/local
minio/local:
	mc alias set local http://localhost:9000 minioadmin minioadmin
	mc mb local/bipc
	mc anonymous set download local/bipc

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

# ==================================================================================== #
# BUILD
# ==================================================================================== #

## build/frontend: build the frontend application
.PHONY: build/frontend
build/frontend:
	cd ./web/frontend && pnpm install && pnpm build

## build/api: build the cmd/api application
.PHONY: build/api
build/api:
	go build -ldflags='-s' -o=./bin/api ./cmd/api
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags='-s' -o=./bin/linux_amd64/api ./cmd/api

# ==================================================================================== #
# PRODUCTION
# ==================================================================================== #

production_host_ip = 68.183.24.32

## production/connect: connect to the production server
.PHONY: production/connect
production/connect:
	ssh -i ~/.ssh/id_rsa_bipc bipc@$(production_host_ip)

# ssh -L :9999:68.183.24.32:4000 -i ~/.ssh/id_rsa_bipc bipc@68.183.24.32

## production/deploy/api: deploy the api to production
.PHONY: production/deploy/api
production/deploy/api:
	rsync -P -e "ssh -i ~/.ssh/id_rsa_bipc" ./bin/linux_amd64/api bipc@$(production_host_ip):~
	rsync -rP --delete -e "ssh -i ~/.ssh/id_rsa_bipc" ./migrations bipc@$(production_host_ip):~
	rsync -P -e "ssh -i ~/.ssh/id_rsa_bipc" .envrc bipc@$(production_host_ip):~
	rsync -P -e "ssh -i ~/.ssh/id_rsa_bipc" ./remote/production/api.service bipc@$(production_host_ip):~
	rsync -P -e "ssh -i ~/.ssh/id_rsa_bipc" ./remote/production/Caddyfile bipc@$(production_host_ip):~
	ssh -t -i ~/.ssh/id_rsa_bipc bipc@$(production_host_ip) '\
		migrate -path ~/migrations -database $(DB_DSN) up \
		&& sudo mv ~/.envrc /etc/environment \
		&& sudo mv ~/api.service /etc/systemd/system/ \
		&& sudo systemctl enable api \
		&& sudo systemctl restart api \
		&& sudo mv ~/Caddyfile /etc/caddy/ \
		&& sudo systemctl reload caddy \
	'



