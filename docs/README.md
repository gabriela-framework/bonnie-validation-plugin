# Remark

This project as well as [Gabriela framework](https://github.com/gabriela-framework/gabriela) are still under development and in alpha
stage. Please, do not use it in production until it get to Beta.

This plugin uses [Joi](https://github.com/hapijs/joi) under the hood from [hapi.js framework](https://github.com/hapijs) but it 
abstract and makes a lot easier to use within Gabriela.

# 1. Installation

This project cannot yet be installed from npm but only cloned. When Gabriela goes in Beta,
all the created plugins will be on npm. But you can clone it and
perhaps, use it as a git submodule.

`git clone git@github.com:gabriela-framework/bonnie-validation-plugin.git`

Since Gabriela is still under development, it is used as a submodule in this plugin.
Because of that, you have to clone gabriela as a submodule and then install Gabriela dependencies.

``cd /path/to/your/project/gabriela``

``git submodule init``

``git submodule update``

``npm install``

Sorry for the inconvenience. 

# 2. Declaring validation in config

For now, we will only see how to declare models in config. 

This plugin validates models, not values. You declare validation configuration
in `config` but you have to create the actual model yourself, before the validation starts.
It is best to see it in example.

`````javascript
const gabriela = require('gabriela');
const validator = require('bonnie-validation-plugin');

const app = gabriela.asProcess({
    config: {
        framework: {},
        // Validation config goes under the 'validator' key
        validator: {
            models: {
                myModel: {
                    // If the model key does not exist on the state, an error is thrown.
                    // You can add an optional custom message if the model does not exist on the state.
                    nonExistentModelMessage: 'Model \'myModel\' does not exist',
                    properties: {
                        name: {
                            type: 'string',
                            constraints: {
                                required: true,
                                min: {
                                    value: 3,
                                    message: 'Name has to have more than 3 characters'
                                },
                                max: 10       
                            }       
                        }
                    }
                }
            }
        }
    }
});

app.addPlugin(validator);

app.startApp();

`````

___
#### Side note: Terminology<br/>
>I refer to *type* value as **main constraint** and *constraints* values as **subconstraints**. Main constraint
>corresponds to what you would use as the first function in validating a Joi schema.
>For example

````javascript
const mySchema = Joi.object({
    username: Joi.string().required().min(3).max(10)
})
````

>Other main constraints are **number**, **boolean**, **date** and others.
>They all correspond to the list that on the [Joi homepage](https://hapi.dev/family/joi/).
>In this example, subconstraints of main constraint *string* are *required*, *min* and *max*
___

Our main constraint is *string* and subconstraints are *required*, *min* and *max*. Every subconstraint
is a function on a Joi schema object. Some of those objects have multiple arguments.
For example, the signature for *min* subconstraint is `Joi.min(value, [encoding)`. If you which
to pass the encoding argument, pass the value of any constraint as an array

````javascript
// ... other config
min: [3, 'encoding'],
````

`Joi.min()` will then be called with both arguments. You can also pass a single value
for this array. Here is a list of all the possible values you can pass for a subconstraint:

`````javascript
min: 3
min: [3],
min: [3, 'encoding'],
min: {
    // all the above possibilities are valid for the 'value' entry like value: [3, 'encoding'] etc...
    value: 3,
    message: 'My custom error message'
}
`````

Of course, *min* is used here as an example. All the subconstraints in the Joi documentation can be 
used in this way. 

# 3. Usage in Gabriela

After we declare our model in config, we can use it in our module so let's expand on our example
from above and create a module that creates a model and validates it. 

````javascript
    const myModule = {
        name: 'myModule',
        init: [function(state) {
            // We create myModel and initialize it to an empty object. This will 
            // make the validation to fail
            state.myModel = {}
        }],
        validators: ['validateMyModel(state)'],
        moduleLogic: [function(state) {
            // state now has a 'myModelErrors' property. If this property
            // is null, 'myModel' is valid. If it holds a list (an object) of errors
            // then it is invalid
            if (state.myModelErrors) {
                // model is invalid
            }
        }]
    }
````

Lets examine this module a little closer. First, what is *validateMyModel(state)*?

Under the hood, validator creates a service that is used as a middleware. By convention, this service
is called *validate[model name from config]*. Since we declared *myModel* in config, this service
is created with the *validateMyModel* name. This service expects the *state* argument so don't forget 
to include it. It also creates a property called *[model name from config]Errors* that is created by convention.
If this property is null, the model is valid. If it holds a list of error, the model is invalid.

````javascript
    // myModelErrors is the 'name' property does not exist
    {
        name: "'name' is required"
    }
````

In order for validation to work, you have to create the model on the *state* before *validateMyModel*
middleware is called. We do that in the *init* middleware but you can do it in any middleware as long as validation
gets called after the model is created.










