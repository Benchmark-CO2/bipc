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

## compose/down-volume: stop and remove the Docker Compose services and volumes
.PHONY: compose/down-volume
compose/down-volume:
	cd ./zarf/compose/ && docker compose -f docker_compose.yaml -p bipc down --volumes

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
	go run ./cmd/api -url=$(URL) -db-dsn=$(DB_DSN) -smtp-host=$(SMTP_HOST) -smtp-port=$(SMTP_PORT) -smtp-sender=$(SMTP_SENDER)

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

## migrations/down-one: apply one down database migration
.PHONY: migrations/down-one
migrations/down-one:
	migrate -path ./migrations -database $(DB_DSN) down 1

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

production_host_ip = 18.230.151.65

## production/connect: connect to the production server
.PHONY: production/connect
production/connect:
	ssh -i ~/.ssh/mestra.pem ubuntu@$(production_host_ip)

## production/deploy/api: deploy the api to production
.PHONY: production/deploy/api
production/deploy/api:
	rsync -P -e "ssh -i ~/.ssh/mestra.pem" ./bin/linux_amd64/api ubuntu@$(production_host_ip):~
	rsync -rP --delete -e "ssh -i ~/.ssh/mestra.pem" ./migrations ubuntu@$(production_host_ip):~
	rsync -P -e "ssh -i ~/.ssh/mestra.pem" .envrc ubuntu@$(production_host_ip):~
	rsync -P -e "ssh -i ~/.ssh/mestra.pem" ./remote/production/api.service ubuntu@$(production_host_ip):~
	rsync -P -e "ssh -i ~/.ssh/mestra.pem" ./remote/production/Caddyfile ubuntu@$(production_host_ip):~
	ssh -t -i ~/.ssh/mestra.pem ubuntu@$(production_host_ip) '\
		migrate -path ~/migrations -database $(DB_DSN) up \
		&& sudo mv ~/.envrc /etc/environment \
		&& sudo systemctl daemon-reload \
		&& sudo mv ~/api.service /etc/systemd/system/ \
		&& sudo systemctl enable api \
		&& sudo systemctl restart api \
		&& sudo mv ~/Caddyfile /etc/caddy/ \
		&& sudo systemctl reload caddy \
	'

## production/deploy/ci: deploy the api to production from CI/CD
.PHONY: production/deploy/ci
production/deploy/ci:
    @echo "$$SSH_PRIVATE_KEY" > /tmp/deploy_key
    @chmod 600 /tmp/deploy_key
    @echo "$$ENV_FILE" > /tmp/.envrc
    rsync -P -e "ssh -i /tmp/deploy_key -o StrictHostKeyChecking=no" ./bin/linux_amd64/api ubuntu@$(production_host_ip):~
    rsync -rP --delete -e "ssh -i /tmp/deploy_key -o StrictHostKeyChecking=no" ./migrations ubuntu@$(production_host_ip):~
    rsync -P -e "ssh -i /tmp/deploy_key -o StrictHostKeyChecking=no" /tmp/.envrc ubuntu@$(production_host_ip):~/.envrc
    rsync -P -e "ssh -i /tmp/deploy_key -o StrictHostKeyChecking=no" ./remote/production/api.service ubuntu@$(production_host_ip):~
    rsync -P -e "ssh -i /tmp/deploy_key -o StrictHostKeyChecking=no" ./remote/production/Caddyfile ubuntu@$(production_host_ip):~
    ssh -t -i /tmp/deploy_key -o StrictHostKeyChecking=no ubuntu@$(production_host_ip) '\
			migrate -path ~/migrations -database $$DB_DSN up \
			&& sudo mv ~/.envrc /etc/environment \
			&& sudo systemctl daemon-reload \
			&& sudo mv ~/api.service /etc/systemd/system/ \
			&& sudo systemctl enable api \
			&& sudo systemctl restart api \
			&& sudo mv ~/Caddyfile /etc/caddy/ \
			&& sudo systemctl reload caddy \
    '
    @rm -f /tmp/deploy_key /tmp/.envrc
# journalctl -xeu api.service
# sudo systemctl status api.service
# ssh -L :9999:$(production_host_ip):4000 -i ~/.ssh/mestra.pem ubuntu@$(production_host_ip)


