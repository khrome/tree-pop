const arrays = require('async-arrays');
const accessor = require('object-accessor');

const capitalize = (s)=>{
    return s.split(' ').map((word)=>{
        return word[0].toUpperCase()+word.substring(1);
    }).join('');
};

const Pop = function(opts){
    this.options = opts || {};
}

Pop.prototype.node = function(type, obs, fuse, cb){
    const fields = Object.keys(obs[0]);
    arrays.forEachEmission(obs, (ob, obi, complete)=>{
        const finalActionsAndFinish = ()=>{
            //TODO: handle recursion
            complete();
        };
        arrays.forEachEmission(fields, (field, index, done)=>{
            const linkField = field.substring(0, field.length - this.options.identifier.length);
            const isExpandable = this.options.expandable(type, field, ob[field]);
            if(!isExpandable) return done();
            this.options.lookup(isExpandable.type, [ob[field]], (err, results)=>{
                let result = results[0];
                if(!result) throw new Error(`Could not find ${isExpandable.type} : ${ob[field]}`);
                if(ob[linkField]) throw new Error(`linked field(${linkField}) already exists.`);
                // if recursive
                const handleRecursionAndFinish = ()=>{
                    ob[linkField] = result;
                    done();
                };
                handleRecursionAndFinish();
            });
        }, ()=>{
            if(this.options.otherLinks){
                this.options.otherLinks(type, ob, (err, result)=>{
                    finalActionsAndFinish();
                });
            }else finalActionsAndFinish();
        })
    }, ()=>{
        cb(null, obs);
    })
};

Pop.prototype.doAttachment = function(type, action, context, cb){
    const internalLink = type+capitalize(this.options.identifier);
    switch(action.mode.toLowerCase()){
        case 'internal': // N : 1
            this.options.lookup(action.target, [context[action.raw]], (err, results)=>{
                if(results[0]) accessor.set(context, action.target, results[0]);
                cb();
            });
            break;
        case 'linked': // N : N
            const internal = action.from === type?'from':'to';
            if(action[internal] !== type) throw new Error('expected an object to link to: '+type);
            const external = action.from === type?'to':'from';
            const criteria = {};
            criteria[internalLink] = context[this.options.identifier];
            this.options.lookup(action.target, criteria, (err, results)=>{
                const externalCriteria = {};
                const externalLink = action[external]+capitalize(this.options.identifier);
                externalCriteria[this.options.identifier] = {'$in': results.map(i => i[externalLink])};
                this.options.lookup(action[external], externalCriteria, (err, results)=>{
                    const listName = action[external]+capitalize(this.options.listSuffix);
                    accessor.set(context, listName, results);
                    cb();
                });
            });
            break;
        case 'external': // 1 : N
            const externalCriteria = {};
            externalCriteria[internalLink] = context[this.options.identifier];
            this.options.lookup(action.target, externalCriteria, (err, results)=>{
                const listName = action.target+capitalize(this.options.listSuffix);
                accessor.set(context, listName, results);
                cb();
            });
            break;
        default: throw new Error('Unrecognized attachment mode: '+action.mode);
    }
};

Pop.prototype.parseBatch = function(type, batch){
    const options = {
        raw: batch,
        mode: batch.indexOf('<') === 0?
            'external':
            batch.indexOf(':') !== -1?
                'linked': 'internal',
        target: batch.indexOf('<') === 0?
            batch.substring(1):
            batch.indexOf(':') !== -1?
                batch.split(':').shift():
                (batch && this.options.expandable(type, batch, 0).type)
                // batch.substring(0, batch.length-identifier.length),
    };
    if(batch.indexOf(':') !== -1){
        const parts = batch.split(':');
        if(parts[1]){
            options.from = parts[1];
            if(parts[2]) options.to = parts[2];
        }
    }
    return options;
};

Pop.prototype.batches = function(type, ob, batches, cb){
    //TODO: abstract away the batch syntax
    arrays.forEachEmission(batches, (batch, index, done)=>{
        if(!batch) return cb(new Error('empty batch!'));
        const options = this.parseBatch(type, batch);
        this.doAttachment(type, options, ob, ()=>{
            done();
        });
    }, ()=>{
        cb(null, ob);
    })
};

Pop.prototype.tree = function(type, o, att, cb){
    const ob = JSON.parse(JSON.stringify(o));
    const callback = typeof att === 'function' && !cb?att:cb;
    const attachments = typeof att === 'function' && !cb?[]:att;
    if(this.options.recursive && ((!attachments) || (!attachments.length))){
        return this.node(type, [ob], this.options.recursive, (err, obs)=>{
            callback(err, obs?obs[0]:null);
        });
    }
    if(attachments.length){
        //do batched
        return this.batches(type, ob, attachments, callback);
    }
    return callback(new Error('No supported mode.'))
};

module.exports = Pop;
