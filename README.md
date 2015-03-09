kodels-dynamodb
===============

[![Build Status](https://travis-ci.org/plasticpanda/kodels-dynamodb.svg?branch=master)](https://travis-ci.org/plasticpanda/kodels-dynamodb) [![Coverage Status](https://img.shields.io/coveralls/plasticpanda/kodels-dynamodb.svg)](https://coveralls.io/r/plasticpanda/kodels-dynamodb?branch=master)
[![Dependencies](https://david-dm.org/plasticpanda/kodels-dynamodb.svg)](https://david-dm.org/plasticpanda/kodels-dynamodb)
[![devDependency Status](https://david-dm.org/plasticpanda/kodels-dynamodb/dev-status.svg)](https://david-dm.org/plasticpanda/kodels-dynamodb#info=devDependencies)  
[![NPM](https://nodei.co/npm/kodels-dynamodb.png)](https://nodei.co/npm/kodels-dynamodb/)


Promised model-ish classes for DynamoDB with strict getters and setters.

For usage check the ```test``` folder.

## Caveats

* Requests will hang or time out ```Error: connect ETIMEDOUT``` if no AWS credentials are provided


## Todo

* Documentation
* Add "type" check
* Support for atomic updates

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see http://www.gnu.org/licenses/.
