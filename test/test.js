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
            ], (err, user)=>{
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
    });
});
