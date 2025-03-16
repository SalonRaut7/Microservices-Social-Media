const Joi = require('joi')

/**
 * Function to validate user registration data
 * @param {Object} data - The user input data containing username, email, and password
 * @returns {Object} - Returns validation result (either error or validated value)
*/

const validateRegistration = (data) =>{
    const schema = Joi.object({
        username : Joi.string().min(3).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
    })
     // Validate data against the schema and return the result
    return schema.validate(data)
}

module.exports = {validateRegistration};