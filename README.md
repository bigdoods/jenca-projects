[![Build Status](https://travis-ci.org/jenca-cloud/jenca-projects.svg)](https://travis-ci.org/jenca-cloud/jenca-projects)

# jenca-projects

The projects service for jenca-cloud. CRUD for project records.

## Development

Clone jenca-cloud repo and follow the readme for vagrant and jencactl to install this service image.

## routes

GET /v1/projects
GET /v1/projects/:projectid
POST /v1/projects
PUT /v1/projects/:projectid
DELETE /v1/projects/:projectid

## CLI

For development and testing, within jenca-projects directory run:
```bash
$ npm test
```