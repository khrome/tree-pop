const should = require('chai').should();
const Pop = require('../tree-pop');
const {
    identifier, listSuffix, linkSuffix, expandable, lookup, otherLinks, directory
} = require('./simple-test-case');

describe('tree-pop', ()=>{
    describe('builds trees', ()=>{
        it('builds a simple tree, recursively', (done)=>{
            const populate = new Pop({
                identifier,
                linkSuffix,
                expandable,
                listSuffix,
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

        it('builds a simple tree, batched', (done)=>{
            const populate = new Pop({
                identifier,
                linkSuffix,
                expandable,
                listSuffix,
                lookup,
                otherLinks
            });
            populate.tree('user', directory.user[0], [
                'sessionId',
                '<post',
                'userAddressLink:user:address'
            ], {}, (err, user)=>{
                should.not.exist(err);
                should.exist(user);
                should.exist(user.id);
                user.id.should.equal(1);
                should.exist(user.handle);
                user.handle.should.equal('edbeggler');
                should.exist(user.sessionId);
                user.sessionId.should.equal(1);
                should.exist(user.session);
                should.exist(user.postList);
                should.exist(user.postList.length);
                user.postList.length.should.equal(2);
                should.exist(user.postList[0]);
                should.exist(user.postList[0].id);
                user.postList[0].id.should.equal(1);
                should.exist(user.postList[0].userId);
                user.postList[0].userId.should.equal(1);
                should.exist(user.postList[0].message);
                user.postList[0].message.should.equal('Just trying this thing out.');
                should.exist(user.postList[1]);
                should.exist(user.postList[1].id);
                user.postList[1].id.should.equal(2);
                should.exist(user.postList[1].userId);
                user.postList[1].userId.should.equal(1);
                should.exist(user.postList[1].message);
                user.postList[1].message.should.equal('Can anyone see this?');
                should.exist(user.addressList);
                should.exist(user.addressList.length);
                user.addressList.length.should.equal(2);
                done();
            });
        });
        
        it('builds a tree, then deconstructs it', (done)=>{
            const populate = new Pop({
                identifier,
                linkSuffix,
                expandable,
                listSuffix,
                lookup,
                otherLinks
            });
            const expansion = [
                'sessionId',
                '<post',
                'userAddressLink:user:address'
            ];
            populate.tree('user', directory.user[0], expansion, {}, (err, user)=>{
                user.addressList.push({ //add a new address
                    street1: '123 Main St.',
                    city: 'Nowhere',
                    state: 'GA',
                    postalcode: '73038'
                });
                populate.deconstruct('user', user, expansion, {}, (err, objects)=>{
                    //make sure the objects coming out match their counterparts
                    Object.keys(directory).forEach((typeName)=>{
                        if(typeName !== 'userAddressLink'){ //don't rewrite existing links
                            directory[typeName].forEach((ob, index)=>{
                                if(objects[typeName][index]){
                                    objects[typeName][index].should.deep.equal(ob);
                                }
                            });
                        }
                    });
                    
                    //do the symbolic references resolve correctly, for the new address?
                    let addressIdType = typeof objects.address[2].id;
                    (addressIdType).should.equal('function');
                    (objects.address[2].id() === null).should.equal(true);
                    let linkIdType = typeof objects.userAddressLink[0].addressId;
                    (linkIdType).should.equal('function');
                    (objects.userAddressLink[0].addressId() === null).should.equal(true);
                    let idValue = 42;
                    (objects.address[2].id(idValue) === idValue).should.equal(true);
                    (objects.userAddressLink[0].addressId() === idValue).should.equal(true);
                    
                    //are the batches ordered according to precedence/order?
                    populate.orderBatches(objects).should.deep.equal([ 
                        'session',
                        'post',
                        'user',
                        'address',
                        'userAddressLink'
                    ]);
                    
                    done();
                });
            });
        });
    });
});
