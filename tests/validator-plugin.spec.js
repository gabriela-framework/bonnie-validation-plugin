const mocha = require('mocha');
const chai = require('chai');
const assert = require('assert');

const it = mocha.it;
const describe = mocha.describe;
const expect = chai.expect;

const gabriela = require('../gabriela/src/index');

const validatorPlugin = require('../src/index');

describe('Validate all the validator plugin features', () => {
    it('should throw an error if the models key is not there', (done) => {
        const app = gabriela.asProcess({
            config: {
                framework: {},
                validator: {
                }
            }
        }, {
            events: {
                catchError(err) {
                    expect(entersMiddleware).to.be.equal(false);

                    expect(err.message).to.be.equal(`Invalid validator config. 'models' key is empty`);

                    done();
                }
            }
        });

        app.addPlugin(validatorPlugin);

        let entersMiddleware = false;
        app.addModule({
            name: 'validatorCheck',
            validators: ['validatePropertyRequiredModel(state)'],
            moduleLogic: [function(state) {
                entersMiddleware = true;

                expect(state).to.not.have.property('propertyRequiredModelErrors');
            }]
        });

        app.startApp();
    });

    it('should throw an error if models key is not an object type', (done) => {
        const app = gabriela.asProcess({
            config: {
                framework: {},
                validator: {
                    models: []
                }
            }
        }, {
            events: {
                catchError(err) {
                    expect(entersMiddleware).to.be.equal(false);

                    expect(err.message).to.be.equal(`Invalid validator config. 'models' key has to be an object`);

                    done();
                }
            }
        });

        app.addPlugin(validatorPlugin);

        let entersMiddleware = false;
        app.addModule({
            name: 'validatorCheck',
            validators: ['validatePropertyRequiredModel(state)'],
            moduleLogic: [function(state) {
                entersMiddleware = true;

                expect(state).to.not.have.property('propertyRequiredModelErrors');
            }]
        });

        app.startApp();
    });

    it ('should call the validator function and create the default \'nonExistentModelMessage\' error when the model does not exist on the state object', (done) => {
        let entersMiddleware = false;

        const app = gabriela.asProcess({
            config: {
                framework: {},
                validator: {
                    models: {
                        myModel: {
                            properties: {
                                name: {
                                    type: 'string',
                                    constraints: {
                                        required: true,
                                        min: [3],
                                        max: 10
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, {
            events: {
                onAppStarted() {
                    expect(entersMiddleware).to.be.equal(true);

                    done();
                }
            }
        });

        app.addPlugin(validatorPlugin);

        app.addModule({
            name: 'validatorCheck',
            init: [function(state) {
                state.propertyRequiredModel = {};
            }],
            validators: ['validateMyModel(state)'],
            moduleLogic: [function(state) {
                entersMiddleware = true;

                expect(state).to.have.property('myModelErrors');
                expect(state.myModelErrors).to.have.property('nonExistentModelMessage');
                expect(state.myModelErrors.nonExistentModelMessage).to.be.equal(`Invalid request. Unknown model 'myModel'.`);
            }]
        });

        app.startApp();
    });

    it ('should call the validator function and create the custom \'nonExistentModelMessage\' error when the model does not exist on the state object', (done) => {
        let entersMiddleware = false;

        const app = gabriela.asProcess({
            config: {
                framework: {},
                validator: {
                    models: {
                        myModel: {
                            nonExistentModelMessage: `Invalid request. Model 'myModel' does not exist`,
                            properties: {
                                name: {
                                    type: 'string',
                                    constraints: {
                                        required: true,
                                        min: [3],
                                        max: 10
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, {
            events: {
                onAppStarted() {
                    expect(entersMiddleware).to.be.equal(true);

                    done();
                }
            }
        });

        app.addPlugin(validatorPlugin);

        app.addModule({
            name: 'validatorCheck',
            init: [function(state) {
                state.propertyRequiredModel = {};
            }],
            validators: ['validateMyModel(state)'],
            moduleLogic: [function(state) {
                entersMiddleware = true;

                expect(state).to.have.property('myModelErrors');
                expect(state.myModelErrors).to.have.property('nonExistentModelMessage');
                expect(state.myModelErrors.nonExistentModelMessage).to.be.equal(`Invalid request. Model 'myModel' does not exist`);
            }]
        });

        app.startApp();
    });

    it('should successfully validate with a custom error message', (done) => {
        let entersMiddleware = false;

        const app = gabriela.asProcess({
            config: {
                framework: {},
                validator: {
                    models: {
                        myModel: {
                            properties: {
                                name: {
                                    type: 'string',
                                    constraints: {
                                        required: true,
                                        min: {
                                            value: 3,
                                            message: `'name' property has to have at least 3 characters`,
                                        },
                                        max: 10
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, {
            events: {
                onAppStarted() {
                    expect(entersMiddleware).to.be.equal(true);

                    done();
                }
            }
        });

        app.addPlugin(validatorPlugin);

        app.addModule({
            name: 'validatorCheck',
            init: [function(state) {
                state.myModel = {
                    name: 'sl'
                };
            }],
            validators: ['validateMyModel(state)'],
            moduleLogic: [function(state) {
                entersMiddleware = true;

                expect(state).to.have.property('myModelErrors');
                expect(state.myModelErrors).to.have.property('name');
                expect(state.myModelErrors.name).to.be.equal(`'name' property has to have at least 3 characters`);
            }]
        });

        app.startApp();
    });
});