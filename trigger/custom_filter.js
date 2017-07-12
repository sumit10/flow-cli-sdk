var util            = require('./utility');

var CustomFilters   = { };

module.exports      = CustomFilters;

CustomFilters.util   = util;

CustomFilters.schema = {
    "type" : "array",
    "title" : "Custom Filters",
    "items" : {
        "type" : "object",
        "title" : "filter",
        "properties" : {
            "input" : {
                "type" : "string",
                "title" : "Input",
                "minLength"  :1
            },
            "operator" : {
                "type" : "string",
                "title" : "Condition",
                "enum" : [
                    "Equals",
                    "Equals(Number)",
                    "GreaterThan",
                    "LessThan",
                    "Contains",
                    "DoesNotContains",
                    "ObjectHasKey",
                    "matches",
                    "isNull",
                    "isEmpty",
                    "isNumber",
                    "isObject",
                    "isArray",
                    "isBoolean",
                    "isDate",
                    "isUndefined"
                ]
            },
            "expected": {
                "type": "string",
                "title": "Expected",
                "minLength":1
            }
        }
    }
};

CustomFilters.filter = filter;

CustomFilters.interpolate = interpolateMultiple;


function interpolateMultiple(input, context){
    if(!input ||
        typeof(input) === "function" ||
        typeof(input.on) === "function"){
        return input;
    }if(Array.isArray(input)){
        input.forEach(function(item, index){
            input[index] = interpolateMultiple(item, context);
        });
    }if(typeof(input) === "object"){
        Object.keys(input).forEach(function(item){
            input[item] = interpolateMultiple(input[item], context);
        });
    }else if(typeof(input) === "string"){
        input = input.trim();
        var parameters = input.match(/{{([^{}]+)}}/g);
        if(parameters && parameters.length){
            var contents = parameters.map(function(itemd){
                itemd = itemd.replace(/{{|}}/g, '').trim();
                return getSafeAccess(context, itemd);
            });
            try{
                if(parameters[0].trim() === input.trim()){
                    return contents[0];
                }
                var objectCount = contents.reduce(function(count, thisItem){
                        if((thisItem && typeof(thisItem) === "object") ||
                        typeof(thisItem) === "boolean" ){
                            ++count;
                        }
                        return count;
                    },
                    0
                );
                if(objectCount){
                    return input.split(/({{[^{}]+}})/gm).filter(function(xitem){
                            return xitem.trim();
                    }).map(function(item){
                        var index = parameters.indexOf(item);
                        if(index !== -1){
                            return contents[index];
                        }
                        return item;
                    });
                }else{
                    parameters.forEach(function(paramItem, index){
                        input = input.replace(paramItem, String(contents[index]));
                    });
                    return input;
                }
            }catch(e){
            }
        }
    }
    return input;
}


function getSafeAccess(obj, str){
    if(!str || !obj || typeof(obj) !== 'object'){
        return str;
    }
    var newObj = obj;
    var tokens = tokenize(str);
    for(var i = 0;i < tokens.length;i++){
        var token = removeArrayMark(tokens[i]).trim();
        newObj = newObj[token];
        if(typeof(newObj) === 'undefined'){
            return 'undefined';
        }
    }
    return newObj;
}

function removeArrayMark(token){
    if( /^\[\w+\]$/.test(token)) {
        return token.replace(/^\[(\w+)\]$/, '$1');
    }
    return token;
}

function tokenize(str) {
    return str.split(/\.|(\(\))|(\[\w+?])/).filter(function(t) {
        return t;
    });
}

function clone(obj){
    if(obj && typeof(obj) === "object"){
        if(Array.isArray(obj)){
            return obj.slice(0);
        }else{
            var ret = { };
            Object.keys(obj).forEach(function(item){
                ret[item] = obj[item];
            });
            return ret;
        }
    }
    return obj;
}

function filter(filters, data, output){
    var customFilters = [ ];
    if(filters && Array.isArray(filters)){
        customFilters = filters.filter(function(item){
            if(item.input && item.input.trim()){
                return true;
            }
        });
    }
    if(!customFilters.length){
        return output(null, data);
    }
    data = Array.isArray(data) ? data : [ data ];
    var matched = data.filter(function(item){
        return customFilters.every(function(matcher){
            var condition = matcher.operator || matcher.condition;
            var context         = clone(item);
            context.$params     = item;
            context.$trigger    = item;
            var data            =  util.assert(interpolateMultiple(matcher.input, context), condition, matcher.expected);
            return data;
        });
    });
    
    if(matched.length){
        return output(null, matched);
    }
    return output(null);
}

function interpolate(input, data){
    var output = data;
    var group = input.replace(/\[([^\[\]]*)\]/g,".$1").split('.').reduce(removeQuotes, []);
    for(var i = 0; i < group.length ; i++){
        try{
            output = output[group[i]];
        }catch(e){
            return input;
        }
    }
    if(typeof(output) === 'undefined'){
        return input;
    }
    return output;
}

function removeQuotes(init, item){
    if(init[init.length - 1 ] &&
        init[init.length - 1 ].match(/^['|"]+/)){
        init[init.length - 1 ] = init[init.length - 1 ] + '.' + item;
        if(init[init.length - 1 ].match(/['|"]+$/)){
            init[init.length - 1 ] = init[init.length - 1 ].replace(/^['|"]+/g, "").replace(/['|"]+$/g, "");
        }
        return init;
    }
    init.push(item);
    return init;
}
