const sift = require('sift').default;
const identifier = 'id';
const linkSuffix = 'link';
const listSuffix = 'list';

const capitalize = (s)=>{
    return s.split(' ').map((word)=>{
        return word[0].toUpperCase()+word.substring(1);
    }).join('');
};

const expandable = (type, fieldName, fieldValue) => {
    // returns falsy *OR* {type, value}
    const index = fieldName.lastIndexOf(capitalize(identifier));
    if(index === -1) return false;
    if(
        // did we find it at the end of the string?
        index + identifier.length === fieldName.length &&
        // is the id an integer?
        Number.isInteger(fieldValue)
    ){
        const linkField = fieldName.substring(0, fieldName.length - identifier.length);
        return {
            type: linkField,
            suffix: fieldName.substring(linkField.length)
        };
    }
    return false;
};

const lookup = (type, context, req, cb) => {
    if(!directory[type]) return cb(new Error('Type not Found!'));
    if(!cb) console.log('NO CB', (new Error()).stack)
    if(Array.isArray(context)){
        const idList = context;
        const results = directory[type].filter((item)=>{
            return idList.indexOf(item[identifier]) !== -1;
        });
        setTimeout(()=>{ cb && cb(null, results); })
    }else{
        const criteria = context;
        const results = directory[type].filter(sift(criteria));
        setTimeout(()=>{ cb && cb(null, results); })
    }
};

const otherLinks = (type, context, cb) => {
    //any other attachments at a given level
    const capitalType = type[0].toUpperCase()+type.substring(1);
    const objectNames = Object.keys(directory);
    const relevant = objectNames.filter((name)=>{
        return (
            name.indexOf(type) !== -1 ||
            name.indexOf(capitalType) !== -1
        ) && name !== type
    });
    setTimeout(()=>{ cb && cb(null); })
};

const directory = {
    user : [{
        id: 1,
        handle: 'edbeggler',
        sessionId: 1,
    }],
    session : [{
        id: 1,
        someKey: 'correspondingValue'
    }],
    address : [
        {
            id: 1,
            street1: '123 Main St.',
            city: 'Nowhere',
            state: 'OK',
            postalcode: '73038'
        },
        {
            id: 2,
            street1: '123 Main St.',
            city: 'Nothing',
            state: 'AZ',
            postalcode: '85360'
        }
    ],
    userAddressLink : [
        {id: 1, userId:1, addressId: 1},
        {id: 2, userId:1, addressId: 2}
    ],
    post : [
        {
            id: 1,
            userId: 1,
            message: 'Just trying this thing out.'
        },
        {
            id: 2,
            userId: 1,
            message: 'Can anyone see this?'
        }
    ],
};

module.exports = {identifier, linkSuffix, listSuffix, expandable, lookup, otherLinks, directory};
