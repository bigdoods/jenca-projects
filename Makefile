.PHONY: images test

VERSION = 1.0.0
SERVICE = jenca-projects
HUBACCOUNT = jenca

ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

# build the docker images
# the dev version includes development node modules
images:
	docker build -t $(HUBACCOUNT)/$(SERVICE):latest .
	docker build -f Dockerfile.dev -t $(HUBACCOUNT)/$(SERVICE):latest-dev .
	docker rmi $(HUBACCOUNT)/$(SERVICE):$(VERSION) $(HUBACCOUNT)/$(SERVICE):$(VERSION)-dev || true
	docker tag $(HUBACCOUNT)/$(SERVICE):latest $(HUBACCOUNT)/$(SERVICE):$(VERSION)
	docker tag $(HUBACCOUNT)/$(SERVICE):latest-dev $(HUBACCOUNT)/$(SERVICE):$(VERSION)-dev

test:
	docker run -ti --rm \
		--entrypoint npm \
		$(HUBACCOUNT)/$(SERVICE):$(VERSION)-dev test
