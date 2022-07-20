const arrays = require('async-arrays');
const accessor = require('object-accessor');

const capitalize = (s)=>{
    return s.split(' ').map((word)=>{
        return word[0].toUpperCase()+word.substring(1);
    }).join('');
};

const join = (...parts)=>{
    let value = '';
    parts.forEach((part, index)=>{
        if(index){
            value += capitalize(part);
        } else value += part;
    });
    return value;
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
    
    const internalLink = ( 
        this.options.join || join
    )(type, this.options.identifier);
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
                if(err) return cb(err);
                const externalCriteria = {};
                const externalLink = ( 
                    this.options.join || join
                )(action[external], this.options.identifier);
                externalCriteria[this.options.identifier] = {'$in': results.map((i) =>{
                    //console.log('I', action, internal, external, type, i, externalLink, internalLink, criteria, (new Error()).stack);
                    return i[externalLink];
                })};
                this.options.lookup(action[external], externalCriteria, (err, results)=>{
                    const listName = ( 
                        this.options.join || join
                    )(action[external], this.options.listSuffix);
                    accessor.set(context, listName, results);
                    cb();
                });
            });
            break;
        case 'external': // 1 : N
            const externalCriteria = {};
            externalCriteria[internalLink] = context[this.options.identifier];
            this.options.lookup(action.target, externalCriteria, (err, results)=>{
                const listName = ( 
                    this.options.join || join
                )(action.target, this.options.listSuffix);
                accessor.set(context, listName, results);
                cb();
            });
            break;
        default: throw new Error('Unrecognized attachment mode: '+action.mode);
    }
};

Pop.prototype.detach = function(type, action, context, cb){
    const internalLink = ( 
        this.options.join || join
    )(type, this.options.identifier);
    let value = null;
    let results = {};
    let listName;
    switch(action.mode.toLowerCase()){
        case 'internal': // N : 1
            value = accessor.get(context, action.target);
            accessor.set(context, action.target, undefined, true);
            if(!results[action.target]) results[action.target] = [];
            results[action.target] = results[action.target].concat([value]);
            break;
        case 'linked': // N : N
            const internal = action.from === type?'from':'to';
            if(action[internal] !== type) throw new Error('expected an object to link to: '+type);
            const external = action.from === type?'to':'from';
            const criteria = {};
            const identifier = this.options.identifier || 'id';
            criteria[internalLink] = context[this.options.identifier];
            listName = ( 
                this.options.join || join
            )(action[external], this.options.listSuffix);
            value = accessor.get(context, listName);
            accessor.set(context, listName, undefined, true);
            if(!results[action.target]) results[action.target] = [];
            if(!results[action[external]]) results[action[external]] = [];
            results[action[external]] = results[action[external]].concat(value);
            let thisLink = ( 
                this.options.join || join
            )(action[internal], 'id');
            let thatLink = ( 
                this.options.join || join
            )(action[external], 'id');
            
            results[action.target] = value.reduce((agg, item)=>{
                //allow linkage?
                if(!item.id){
                    let ob = {};
                    let reference = '**'+Math.floor(Math.random()*999999999)+'**';
                    let value =  null;
                    item.id = function(v){
                        if(v) value = v;
                        return value;
                    };
                    item.id.pointsTo = () => action[external];
                    item.id.toJSON = ()=>{ return item.id() };
                    ob[thisLink] = ()=> context.id;
                    ob[thisLink].pointsTo = () => action[internal];
                    ob[thisLink].toJSON = ()=>{ return ob[thisLink]() };
                    ob[thatLink] = item.id;
                    let idVal =  null;
                    ob[identifier] = function(v){
                        if(v) idVal = v;
                        return idVal;
                    };
                    ob[identifier].pointsTo = () => action.target;
                    ob[identifier].toJSON = () => idVal;
                    agg.push(ob);
                }
                return agg;
            }, []);
            break;
        case 'external': // 1 : N
            const externalCriteria = {};
            externalCriteria[internalLink] = context[this.options.identifier];
            listName = ( 
                this.options.join || join
            )(action.target, this.options.listSuffix);
            value = accessor.get(context, listName);
            accessor.set(context, listName, undefined, true);
            if(!results[action.target]) results[action.target] = [];
            results[action.target] = results[action.target].concat(value);
            break;
        default: throw new Error('Unrecognized attachment mode: '+action.mode);
    }
    cb(null, results)
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
    return this.byBatch(type, ob, batches, (options, done)=>{
        this.doAttachment(type, options, ob, ()=>{
            done();
        });
    }, cb);
};

Pop.prototype.byBatch = function(type, ob, batches, action, cb){
    //TODO: abstract away the batch syntax
    arrays.forEachEmission(batches, (batch, index, done)=>{
        if(!batch) return cb(new Error('empty batch!'));
        const options = this.parseBatch(type, batch);
        action(options, done);
        /*this.doAttachment(type, options, ob, ()=>{
            done();
        });*/
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

Pop.prototype.deconstruct = function(type, o, att, cb){
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
        let resres = [];
        return this.byBatch(type, ob, attachments, (options, done)=>{
            this.detach(type, options, ob, (err, results)=>{
                resres.push(results);
                done();
            });
        }, (err, res)=>{
            let finres = resres.reduce((agg, item)=>{
                Object.keys(item).forEach((key)=>{
                    if(agg[key]) agg[key] = agg[key].concat(item[key]);
                    else agg[key] = item[key];
                });
                return agg;
            }, {});
            let trg = JSON.parse(JSON.stringify(res))
            if(finres[type]) finres[type] = finres[type].concat([trg]);
            else finres[type] = [trg];
            cb(err, finres);
        });
    }
    return callback(new Error('No supported mode.'))
};

Pop.prototype.orderBatches = function(batches){
    let results = [];
    let getDependencies = (batch)=>{
        let deps = [];
        Object.keys(batch).forEach((typeName)=>{
            const typeIndex = deps.indexOf(typeName);
            if(typeIndex === -1){
                batch[typeName].forEach((ob, index)=>{
                    Object.keys(ob).forEach((fieldName)=>{
                        if(
                            typeof ob[fieldName] === 'function' && 
                            fieldName !== this.options.identifier
                        ){
                            let dep = ob[fieldName].pointsTo();
                            if(deps.indexOf(dep) === -1) deps.push(dep);
                        }
                    });
                });
                deps.push(typeName);
            }else{ //
                batch[typeName].forEach((ob, index)=>{
                    Object.keys(ob).forEach((fieldName)=>{
                        if(
                            typeof ob[fieldName] === 'function' && 
                            fieldName !== this.options.identifier
                        ){
                            let dep = ob[fieldName].pointsTo();
                            if(deps.indexOf(dep) === -1) deps.splice(typeIndex, 0, dep);
                        }
                    });
                });
            }
        });
        return deps;
    }
    return getDependencies(batches);
};

module.exports = Pop;
