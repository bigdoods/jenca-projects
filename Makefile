.PHONY: images test

VERSION = 1.0.0
SERVICE = jenca-projects

ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

# build the docker images
# the dev version includes development node modules
images:
	docker build -t jenca-cloud/$(SERVICE):latest .
	docker build -f Dockerfile.dev -t jenca-cloud/$(SERVICE):latest-dev .
	docker rmi jenca-cloud/$(SERVICE):$(VERSION) jenca-cloud/$(SERVICE):$(VERSION)-dev || true
	docker tag jenca-cloud/$(SERVICE):latest jenca-cloud/$(SERVICE):$(VERSION)
	docker tag jenca-cloud/$(SERVICE):latest-dev jenca-cloud/$(SERVICE):$(VERSION)-dev

test:
	docker run -ti --rm \
		--entrypoint npm \
		jenca-cloud/$(SERVICE):$(VERSION)-dev test
