'Use strict';

var currentRuleSet;

module.exports = {
    
    /**
     * 
     * produces: application/json, text/json
     */

  get: function validate() {
        return function(req, res) {
            // Parse our rule content
            var parsed = parse(req);
            var out = { 'valid': false };

            // If we have a string, there was a major error in parsing
            if (typeof parsed === "string") {
                out.critical = parsed;
                console.log("The request failed because it was missing the business rule:\n" + JSON.stringify(req.body));
                return res.status(400).send("You need to provide a string of JSON code to execute." + out);


            }
            var error;

            try {

                var sandbox = req.body.context ? req.body.context : {};

                var code = "{\n" + req.body.textContent + "\n}\n ";

                var results = [];

                try {

                    vm.runInNewContext(code, sandbox);
                    // Process each individually defined rule in the array
                    for (var i = 0; i < parsed.length; i++) {
                        setCurrentRuleSet(parsed[i], i);
                        results = errors.concat(validateRuleSet(currentRuleSet));
                    }

                } catch (error) {
                    console.log("The execution of the JSON code:\n" + req.body.script + "\nAnd Context:\n" + JSON.stringify(req.body.context) + "\nFailed with error:\n" + error);
                    return res.status(400).send("The JSON code you provided has an error in it. You must provide vaid JSON code that only references data in the sandbox.\n\n" + error);


                }


                // Set valid depending on number of errors
                out.valid = results.length > 0 ? false : true;
                if (results.length > 0) {
                    out.errors = results;
                }

                sandbox.result = out;
                res.json(sandbox.result);

            } catch (error) {

                console.log("The execution of the business rule :\n" + req.body.script + "\nAnd Context:\n" + JSON.stringify(req.body.context) + "\nFailed with error:\n" + error);
                return res.status(400).send("Was not able to process the response from the Business Rule you provided.\n\n" + error);

            }
            return res.status(400).send("Was not able to process the response from the Business Rule you provided.\n\n" + out);
        }
    }
}

function parse(data) {
            if (typeof data !== "string") {
                return "Invalid data - Not a string";
            }
            var parsed;
            try {
                parsed = JSON.parse(data);
            } catch (e) {
                return "Invalid JSON - " + e.toString();
            }
            if (typeof parsed !== "object" || parsed === null) {
                return "Invalid JSON - not an object: got instead: " + typeof parsed;
            }

            if (parsed.length === undefined) {
                return "Invalid JSON - not an array";
            }

            return parsed;
        };

        function setCurrentRuleSet(parsed, i) {

            currentRuleSet = parsed;
            currentRuleSet.id = currentRuleSet.hasOwnProperty("id") ? currentRuleSet.id : "Rule #" + i;
        };

        function validateActions(name, obj) {
            var errors = [];
            for (var idx in obj) {
                if (obj.hasOwnProperty(idx)) {
                    var object = obj[idx];
                    for (var key in object) {
                        if (object.hasOwnProperty(key)) {
                            if (key in ACTION_FIELDS) {
                                var field = ACTION_FIELDS[key];
                                var value = object[key];
                                errors = errors.concat(validateType(key, field, value));
                            } else {
                                errors.push(currentRuleSet.id + " invalid action specified: " + key);
                            }
                        }
                    }
                }
            }

            return errors;
        };

        function validateAdditionalField(name, field, additionalName, obj) {

            var errors = [];
            if (obj[additionalName] === undefined && field.required) {
                errors.push(currentRuleSet.id + " missing required additional field for " + name + ": " + additionalName);
                return errors;
            }
            errors = errors.concat(validateType(additionalName, field, obj[additionalName]));
            return errors;
        };

        function validateCondition(obj) {
            var errors = [];
            if (obj.condition in VALID_CONDITIONS) {
                var additionalFields = VALID_CONDITIONS[obj.condition].additionalFields;
                for (var idx in additionalFields) {
                    if (additionalFields.hasOwnProperty(idx)) {
                        var name = additionalFields[idx];
                        var field = ADDITIONAL_FIELDS[name];
                        errors = errors.concat(validateAdditionalField(obj.condition, field, name, obj));
                        continue;
                    }
                }
            } else {
                errors.push(currentRuleSet.id + " does not have valid condition specified: " + obj.condition);
            }
            return errors;

        };

        function validateRule(name, obj) {

            var errors = [];
            var comboFound = false;
            for (var comboname in COMBINATION_FIELDS) {
                if (COMBINATION_FIELDS.hasOwnProperty(comboname)) {
                    if (comboname in obj) {
                        comboFound = true;
                        // We've hit one of combination fields
                        var typeErrors = validateType(comboname, COMBINATION_FIELDS[comboname], obj[comboname]);
                        if (typeErrors.length > 0) {
                            errors = errors.concat(typeErrors);
                            continue;
                        }
                        // Recurse to find the actual condition
                        var recurseObj = obj[comboname];
                        if (recurseObj instanceof Array) {
                            // We hit and/or, so we need to get at the actual objects for recursing
                            for (var idx in recurseObj) {
                                if (recurseObj.hasOwnProperty(idx)) {
                                    errors = errors.concat(validateRule(comboname, recurseObj[idx]));
                                }
                            }
                        } else {
                            errors = errors.concat(validateRule(comboname, recurseObj));
                        }
                    }
                }
            }
            if (!comboFound) {
                // if we didn't find our combination fields, must be the condition
                errors = errors.concat(validateRuleFields(obj));
            }
            return errors;

        };

        function validateRuleFields(obj) {
            var errors = [];
            for (var rulename in RULE_FIELDS) {
                if (RULE_FIELDS.hasOwnProperty(rulename)) {
                    var field = RULE_FIELDS[rulename];
                    if (obj[rulename] === undefined && field.required) {
                        errors.push(currentRuleSet.id + " missing required field: " + rulename);
                        continue;
                    }
                    if (typeof field.validate === "function") {
                        errors = errors.concat(field.validate(obj));
                    }
                    continue;
                }
            }
            return errors;

        };

        function validateRuleSet(parsed) {

            var errors = [];
            for (var name in MAIN_FIELDS) {
                if (MAIN_FIELDS.hasOwnProperty(name)) {
                    var field = MAIN_FIELDS[name];
                    if (parsed[name] === undefined && field.required) {
                        errors.push(currentRuleSet.id + " missing required field: " + name);
                        continue;
                    } else if (parsed[name] === undefined) {
                        // It's empty, but not necessary
                        continue;
                    }

                    // Type checking
                    var typeErrors = validateType(name, field, parsed[name]);
                    if (typeErrors.length > 0) {
                        errors = errors.concat(typeErrors);
                        continue;
                    }

                    // Validation function check
                    if (typeof field.validate === "function") {
                        // Validation is expected to return an array of errors (empty means no errors)
                        errors = errors.concat(field.validate(name, parsed[name]));
                    }
                }
            }
            return errors;
        };

        function validateType(name, field, value) {
            var errors = [];
            if (field.types || field.type) {
                var validFieldTypes = field.types || [field.type];
                var valueType = value instanceof Array ? "array" : typeof value;
                if (validFieldTypes.indexOf(valueType) === -1) {
                    errors.push(currentRuleSet.id + ": Type for field " + name + ", was expected to be " + validFieldTypes.join(" or ") + ", not " + typeof value);
                }
            }
            return errors;
        };


        MAIN_FIELDS = {
            'id': { required: true, type: "string" },
            'description': { required: false, type: "string" },
            'rule': { required: true, type: "object", validate: validateRule },
            'actions': { required: false, type: "array", validate: validateActions }
        };

        RULE_FIELDS = {
            'condition': { required: true, type: "string", validate: validateCondition },
            'property': { required: true, type: "string" }
        };

        COMBINATION_FIELDS = {
            'if': { required: false, type: "object" },
            'then': { required: false, type: "object" },
            'and': { required: false, type: "array" },
            'or': { required: false, type: "array" }
        };

        ACTION_FIELDS = {
            'callOnTrue': { required: false, type: "string", additionalFields: ["args"] },
            'callOnFalse': { required: false, type: "string", additionalFields: ["args"] },
            'args': { required: false, type: "array" },
            'returnOnTrue': { required: false, type: "string" },
            'returnOnFalse': { required: false, type: "string" }
        };

        ADDITIONAL_FIELDS = {
            'value': { required: true, types: ["string", "number"] },
            'values': { required: true, type: "array" },
            'start': { required: true, type: "number" },
            'end': { required: true, type: "number" },
            'function': { required: true, type: "string" }
        };

        VALID_CONDITIONS = {
            'call': { additionalFields: ["function"] },
            'email_address': {},
            'zipcode': {},
            'yyyy_mm_dd_hh_mm_ss': {},
            'yyyy_mm_dd_hh_mm': {},
            'yyyy_mm_dd': {},
            'mm_dd_yyyy': {},
            'yyyy': {},
            'hh_mm': {},
            'hh_mm_ss': {},
            'matches_regex': { additionalFields: ["value"] },
            'is_integer': {},
            'is_float': {},
            'equal': { additionalFields: ["value"] },
            'not_equal': { additionalFields: ["value"] },
            'greater_than': { additionalFields: ["value"] },
            'less_than': { additionalFields: ["value"] },
            'greater_than_or_equal': { additionalFields: ["value"] },
            'less_than_or_equal': { additionalFields: ["value"] },
            'equal_property': { additionalFields: ["value"] },
            'not_equal_property': { additionalFields: ["value"] },
            'greater_than_property': { additionalFields: ["value"] },
            'less_than_property': { additionalFields: ["value"] },
            'greater_than_or_equal_property': { additionalFields: ["value"] },
            'less_than_or_equal_property': { additionalFields: ["value"] },
            'between': { additionalFields: ["start", "end"] },
            'starts_with': { additionalFields: ["value"] },
            'ends_with': { additionalFields: ["value"] },
            'contains': { additionalFields: ["value"] },
            'not_empty': {},
            'is_empty': {},
            'is_true': {},
            'is_false': {},
            'in': { additionalFields: ["values"] },
            'not_in': { additionalFields: ["values"] },
            'does_not_contain': { additionalFields: ["value"] },
            'includes_all': { additionalFields: ["values"] },
            'includes_none': { additionalFields: ["values"] }

};