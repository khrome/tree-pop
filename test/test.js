const should = require('chai').should();
const Pop = require('../tree-pop');

describe('tree-pop', ()=>{
    describe('builds trees', ()=>{
        it('builds a simple tree, recursively', (done)=>{
            const populate = new Pop({
                identifier,
                linkSuffix,
                expandable,
                lookup,
                otherLinks,
                recursive : true
            });
            populate.tree('user', directory.user[0], (err, tree)=>{
                should.exist(tree);
                should.exist(tree[identifier]);
                should.exist(tree.session);
                should.exist(tree.session.someKey);
                done();
            });
        });

        it.skip('builds a simple tree, batched', ()=>{
            const identifier = 'id';
            const linkSuffix = 'link';
            const populate = new Pop({
                identifier,
                linkSuffix,
                expandable,
                lookup,
                otherLinks,
                recursive : true
            });
            populate.tree('user', directory.user[0]);
        });
    });
});

const identifier = 'id';
const linkSuffix = 'link';

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
const lookup = (type, context, cb) => {
    if(!directory[type]) return cb(new Error('Type not Found!'));
    if(Array.isArray(context)){
        const idList = context;
        const results = directory[type].filter((item)=>{
            return idList.indexOf(item[identifier]) !== -1;
        });
        setTimeout(()=>{ cb && cb(null, results); })
    }else{
        const criteria = context;
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
    console.log(relevant);
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
