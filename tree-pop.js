const arrays = require('async-arrays')

const Pop = function(opts){
    this.options = opts || {};
}

Pop.prototype.node = function(type, obs, fuse, cb){
    const fields = Object.keys(obs[0]);
    arrays.forEachEmission(obs, (ob, obi, complete)=>{
        arrays.forEachEmission(fields, (field, index, done)=>{
            const linkField = field.substring(0, field.length - this.options.identifier.length);
            const isExpandable = this.options.expandable(type, field, ob[field]);
            if(!isExpandable) return done();
            this.options.lookup(isExpandable.type, [ob[field]], (err, results)=>{
                let result = results[0];
                if(!result) throw new Error(`Could not find ${isExpandable.type} : ${ob[field]}`);
                if(ob[linkField]) throw new Error(`linked field(${linkField}) already exists.`);
                ob[linkField] = result;
                // if recursive
                done()
            });
        }, ()=>{
            complete();
        })
    }, ()=>{
        cb(null, obs);
    })
};

Pop.prototype.batches = function(type, ob, batches, cb){
    arrays.forEachEmission(batches, (batch, index, done)=>{

    }, ()=>{
        cb(null, ob);
    })
};

Pop.prototype.tree = function(type, ob, att, cb){
    const callback = typeof att === 'function' && !cb?att:cb;
    const attachments = typeof att === 'function' && !cb?[]:att;
    if(this.options.recursive && ((!attachments) || (!attachments.length))){
        return this.node(type, [ob], this.options.recursive, (err, obs)=>{
            callback(err, obs?obs[0]:null);
        });
    }
    if(this.options.batched && attachments.length){
        //do batched
        return this.batches(type, [ob], attachments, callback);
    }
};

module.exports = Pop;
