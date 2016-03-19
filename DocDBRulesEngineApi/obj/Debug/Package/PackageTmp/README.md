# DocDBRulesEngineApi

## API Documentation ##
This API app is a Rules Engine that uses JSON Documents for defining business rules

The API app has one action - Validate - which returns "Result" array parameter. 

## Specification Basics

A DocDbRules compliant file is a JSON document that contains an array that is a list of objects for each of your rule definitions.  In the simplest form, a complaint document looks like this:
```json
[
  {
    "rule": {
      "condition": "email_address",
      "property": "user.email"
    }
  }
]
```
Each rule object in the array is defined by the following main properties:

 - id: **required**
 - description: *optional*
 - rule: **required**
    - property: **required**
    - condition: **required**
    - value: *optional*
 - actions: *optional*

### Schema
```json

```

Unless custom actions are defined, the engine should simply evaluate the defined rule as boolean true or false.

### Defining a Rule

#### Valid Conditions

##### Custom function call
 - call
  - function

##### Formatting

 - email_address
 - zipcode
 - yyyy_mm_dd_hh_mm_ss
 - yyyy_mm_dd_hh_mm
 - yyyy_mm_dd
 - mm_dd_yyyy
 - yyyy
 - hh_mm
 - hh_mm_ss
 - matches_regex
  - value

##### Value Comparison

###### Numeric

 - is_integer
 - is_float
 - equal
  - value
 - equal_property
  - value
 - not_equal
  - value
 - not_equal_property
  - value
 - greater_than
  - value
 - greater_than_property
  - value
 - less_than
  - value
 - less_than_property
  - value
 - greater_than_or_equal
  - value
 - greater_than_or_equal_property
  - value
 - less_than_or_equal
  - value
 - less_than_or_equal_property
  - value
 - between
  - start
  - end

###### String

 - equal
  - value
 - equal_property
  - value
 - not_equal
  - value
 - not_equal_property
  - value
 - starts_with
  - value
 - ends_with
  - value
 - contains
  - value
 - not_empty
 - is_empty

###### Boolean

 - is_true
 - is_false

###### List

 - in
  - values
 - not_in
  - values
 - contains
  - value
 - does_not_contain
  - value
 - includes_all
  - values
 - includes_none
  - values

#### Combining Conditions

 - if
 - then
 - and
 - or

### Defining Actions

 - callOnTrue
  - args
 - callOnFalse
  - args
 - returnOnTrue
 - returnOnFalse

## Rules Documents storage
Rules can be store in DocumentDB



## Examples
### basic
```json
[
    {
        "id": "Rule1",
        "description": "Check MyObject.zip is a proper Zipcode",
        "rule": {
            "property":"MyObject.zip",
            "condition":"zipcode"
        },
        "actions": [
            {
                "callOnFalse": "rejectZip",
                "args": [ "MyObject.zip" ]
            },
            {
                "callOnTrue": "acceptZip",
                "args": []
            }
        ]
    },
    {
        "id": "Rule2",
        "description": "Check MyObject.name equals Foo",
        "rule": {
            "property":"MyObject.name",
            "condition":"equal",
            "value":"Foo"
        },
        "actions": [
            { "returnOnFalse": "No, name was not Foo" },
            { "returnOnTrue": "Yes, name is Foo" }
        ]
    }
]
```

### advanced 
```json
[
    {
        "id": "Rule1",
        "description": "If MyObject.zip is a zipcode, then MyObject.state should not be empty",
        "rule": {
            "if": {
                "property":"MyObject.zip",
                "condition":"zipcode"
            },
            "then": {
                "property":"MyObject.state",
                "condition":"not_empty"
            }
        },
        "actions": []
    },
    {
        "id": "Rule2",
        "description": "If MyObject.first_name=Oscar, and MyObject.last_name=Meyer, then MyObject.type should = wiener",
        "rule": {
            "if": {
                "and": [
                    {
                        "property":"MyObject.first_name",
                        "condition":"equal",
                        "value":"Oscar"
                    },
                    {
                        "property":"MyObject.last_name",
                        "condition":"equal",
                        "value":"Meyer"
                    }
                ]
            },
            "then": {
                "property":"MyObject.type",
                "condition":"equal",
                "value":"wiener"
            }
        },
        "actions": []
    }
]
```
