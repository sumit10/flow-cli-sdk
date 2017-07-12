var _           = require('underscore');

function assert(value, condition, expected){
    expected = String(expected);
    var exp = expected.match(/false/i) ? false : true;
    switch(condition){
        case "isNull":
            return (_.isNull(value) == exp);
        case "isEmpty":
            return (_.isEmpty(value) == exp);
        case "isNumber":
            return (_.isFinite(value) == exp);
        case "isObject":
            return (_.isObject(value) == exp);
        case "isArray":
            return (_.isArray(value) === exp);
        case "isBoolean":
            return (_.isBoolean(value) === exp);
        case "isDate":
            return (_.isDate(value) === exp);
        case "isUndefined":
            return (_.isUndefined(value) === exp);
        case "matches" :
        case "Matches" :
            if(expected.match(/^\//)){
                var regContent = expected.replace(/^\/+/,"");
                regContent = regContent.substr(0, regContent.lastIndexOf("/"));
                var modifier = expected.substr(expected.lastIndexOf("/") + 1, expected.length);
                var regEx = RegExp(regContent, modifier);
                return regEx.test(value);
            }else{
                var regExx = RegExp(expected);
                return regExx.test(value);
            }
        case "Equals":
            return (value == expected);
        case "Equals(Number)":
            return (Number(value) === Number(expected));
        case "GreaterThan":
            if(!isNaN(expected)){
                return (Number(value) > Number(expected));
            }
            return (value > expected);
        case "LessThan":
            if(!isNaN(expected)){
                return (Number(value) < Number(expected));
            }
            return (value < expected);
        case "Contains":
            return !!(value.indexOf(expected) + 1);
        case "DoesNotContains":
            return !(value.indexOf(expected) + 1);
        case "ObjectHasKey":
            if(value && _.isObject(value)){
                return _.has(value, exp);
            }
            return false;
        default:
            return false;
    }
}

function kickIfNotAdmin(req, res, next){
    if(req && req.headers &&
        req.headers.admin_key === config.ADMIN_KEY){
        return next();
    }
    res.status(401).send('Unauthorized');
}

function clone(obj){
    var newObj = { };
    Object.keys(obj).forEach(function(item){
        newObj[item] = obj[item];
    });
    return newObj;
}

function noop(cb){
    if(typeof(cb) === "function"){
        cb();
    }
}


function fetchData(httpOpt, callback){
    httpOpt.headers = httpOpt.headers || { };
    var opt = {
        url     : httpOpt.url,
        method  : (httpOpt.method || "get"),
        headers : httpOpt.headers,
        qs      : (httpOpt.query || { })
    };
    if(httpOpt.method !== "get" && httpOpt.data && !httpOpt.headers['content-type']){
        opt.json = httpOpt.data;
    }else{
        opt.body = httpOpt.data;
    }
    if(httpOpt.auth){
        opt.auth = httpOpt.auth;
    }
    request(opt, function(error, res, body){
        if(error){
            return callback(error);
        }
        if(!res || !res.statusCode || res.statusCode < 200 || res.statusCode >= 400){
            return callback(body);
        }
        if(body && typeof(body) === "string"){
            try{
                body = JSON.parse(body);
            }catch(e){
                console.log(e);
            }
        }
        if(httpOpt.dataStorePoint){
            var dataStoreKey = httpOpt.dataStorePoint;
            return callback(null, body[dataStoreKey]);
        }
        callback(null, body);
    });
}

function deepClone(obj){
    if(obj && typeof(obj) === "object" && !Array.isArray(obj)){
        return _.clone(obj);
    }else if(Array.isArray(obj)){
        return obj.map(function(item){
            return deepClone(item);
        });
    }else{
        return obj;
    }
}

function fetchAllDeltaData(httpOpt, callback){
    var finalData = [ ];
    function callbackHandler(newOpt){
        var newHttpOpt = httpOpt;
        if(newOpt){
            newHttpOpt = deepClone(newHttpOpt);
            Object.keys(newOpt).forEach(function(item){
                if(newOpt[item] && typeof(newOpt[item]) === "object"){
                    Object.keys(newOpt[item]).forEach(function(key){
                        if(!newHttpOpt[item]){
                            newHttpOpt[item] = { };
                        }
                        newHttpOpt[item][key] = newOpt[item][key];
                    });
                }
            });
        }
        fetchData(newHttpOpt, function(err, data){
            if(!err){
                if(Array.isArray(data)){
                    finalData = finalData.concat(data);
                }else{
                    finalData[finalData.length] = data;
                }
            }
            callback(err, finalData, callbackHandler, newHttpOpt);
        });
    }
    fetchData(httpOpt, function(err, data){
        if(!err){
            if(Array.isArray(data)){
                finalData = finalData.concat(data);
            }else{
                finalData[finalData.length] = data;
            }
        }
        callback(err, finalData, callbackHandler, httpOpt);
    });
}



function filterDateGreaterThan(array, filterValue, checkPoint){
    filterValue = isNaN(filterValue) ? filterValue : Number(filterValue);
    filterValue = (new Date(filterValue)).getTime();
    return array.filter(function(item){
        var itemDate = getValueFromCheckPoint(item, checkPoint);
        itemDate = (new Date(itemDate)).getTime();
        if(itemDate > filterValue){
            return true;
        }
    });
}

function getTopDate(array, checkPoint){
    var topDate = 0;
    array.forEach(function(item){
        var itemDate = getValueFromCheckPoint(item, checkPoint);
        itemDate = (new Date(itemDate)).getTime();
        if(itemDate > topDate){
            topDate = itemDate;
        }
    });
    return topDate;
}



function filterNumberGreaterThan(array, filterValue, checkPoint){
    filterValue = Number(filterValue);
    return array.filter(function(item){
        var itemNumber = getValueFromCheckPoint(item, checkPoint);
        if(itemNumber > filterValue){
            return true;
        }
    });
}

function getValueFromCheckPoint(object, checkPoint){
    checkPoint = checkPoint.split('.');
    var value = object ;
    checkPoint.some(function(item){
        value = value[item];
        if(typeof(value) === "undefined"){
            return true;
        }
    });
    return value;
}

module.exports = {
    assert                  : assert,
    kickIfNotAdmin          : kickIfNotAdmin,
    clone                   : clone,
    noop                    : noop,
    fetchAllDeltaData       : fetchAllDeltaData,
    filterDateGreaterThan   : filterDateGreaterThan,
    getTopDate              : getTopDate,
    filterNumberGreaterThan : filterNumberGreaterThan
};
