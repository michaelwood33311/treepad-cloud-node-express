// Useful Knex Cheat Sheets:

//     https://devhints.io/knex
//     https://dev.to/hoanganhlam/knex-cheat-sheet-79o
const knex = require('knex')(require('../knexfile').development);
const bcrypt = require("bcrypt");
const knexCore = require('./knex-core');
const reservedTreeId = 1;


/* addTree occurs in three steps:
    1) A new tree is created in trees
    2) A new branch is created in branches
    3) The trees.branch_order is updated with initial state of the new branch
*/


const updateNewTreeWithInitialBranch = (treeId, branchId) => {
    console.log('branch added', branchId);
    return knex('trees')
    .update ({
        branch_order: JSON.stringify([`${branchId}:1`])
    })
    .where ({
        tree_id: treeId
    })
}

const createNewLeaf = branchId => {
    return knex('leaves')
    .insert({
        branch_id: branchId
    })
}

const updateNewBranchWithInitialLeaf = (branchId, leafId) => {
    return knex('branches')
    .update({
        leaf_id: leafId
    })
    .where({
        branch_id: branchId
    })
}

exports.addTree = (req, res) => {
    console.log("addTree", req.body);

    let {userId, icon, treeName, treeDesc, color} = req.body;

    if (!userId || !icon || !treeName) {
        return res.status(400).json({status: 'error', message: 'missing input(s)'}); 
    }

    if (!treeDesc) treeDesc = '';

    if (!color) color = '#000000';

    let treeId;
    let branchId;
    let leafId;

    knexCore.initializeNewTree (userId, icon, treeName, treeDesc, color)
    .then(info => {
        treeId = info;
        return knexCore.createNewBranch(treeId)
    })   
    .then(info => {
        branchId = info[0];
        return updateNewTreeWithInitialBranch(treeId, branchId)
    })
    // .then(info => {
    //     return createNewLeaf(branchId)
    // })
    // .then(info => {
    //     leafId = info[0];
    //     return updateNewBranchWithInitialLeaf(branchId, leafId)
    // })
    .then(info => {
        res.status(200).json({status: "success"});
    })
    .catch(err => {
        console.log (`create new tree error`, err);
        res.status(401).json({status: "error", message: err});
    })
}

exports.updateBranchPool = (req, res) => {
    let {userId, branchId, treeId} = req.params;
    console.log(`knex-commands.js updateBranchPool userId, branchId, treeId`, userId, branchId, treeId);

    if (!userId) {
        return res.status(401).json({status: 'error', message: 'missing userId'}); 
    }

    if (!branchId) {
        return res.status(401).json({status: 'error', message: 'missing branchId'}); 
    }

    if (!treeId) {
        return res.status(401).json({status: 'error', message: 'missing treeId'}); 
    }

    let newBranch;

    knexCore.createNewBranch(reservedTreeId)
    .then(info => {
        newBranch = info[0];
        return knex('users')
        .select('branch_pool')
        .where({
            user_id: userId
        })
    })
    .then(info => {
        console.log(`knex-commands.js updateBranchPool select info`, JSON.stringify(info[0]))
        let branchPool = JSON.parse(info[0].branch_pool)
        console.log(`knex-commands.js updateBranchPool branchPool`, branchPool);
        branchId = Number(branchId);
        branchPool = branchPool.map(branch => {
            console.log(`knex-commands.js updateBranchPool compare ${branch}:${typeof branch} to ${branchId}:${typeof branchId}`);
            return branch !== branchId ? branch : newBranch
        })
        console.log(`knex-commands.js updateBranchPool new branchPool`, branchPool);
        return knex('users')
        .update ({
            branch_pool: JSON.stringify(branchPool)
        })
        .where({
            user_id : userId
        })
    })
    .then(info => {
        return knex('branches')
        .update({
            tree_id: treeId
        })
        .where({
            branch_id: branchId
        })
    })
    .then(info => {
        res.status(200).json({userId: userId, branchId: newBranch});
    })
    .catch(err => {
        console.error(`knex-commands.js updateBranchPool`, err);
    })
}

exports.getTrees = (req, res) => {
    const {userId} = req.params;

    if (!userId) {
        return res.status(401).json({status: 'error', message: 'missing userId'}); 
    }

    knex('trees')
    .join('users', {'trees.user_id': 'users.user_id'})
    .select('tree_id', 'users.user_name', 'trees.user_id', 'icon', 'tree_name', 'tree_desc')
    .where({"trees.user_id": userId})
    .then (data => res.status(200).json({status: 'success', message: data}))
    .catch (err => res.status(401).json({status: 'error', message: err}));
}

exports.getBranchPool = (req, res) => {
    const {userId} = req.params;

    if (!userId) {
        return res.status(401).json({status: 'error', message: 'missing userId'}); 
    }

    knex('users')
    .select('user_id', 'branch_pool')
    .where({"user_id": userId})
    .then (data => res.status(200).json({status: 'success', message: data}))
    .catch (err => res.status(401).json({status: 'error', message: err}));
}

exports.getBranches = (req, res) => {
    const {treeId} = req.params;

    if (!treeId) {
        return res.status(401).json({status: 'error', message: 'missing treeId'}); 
    }

    knex('trees')
    .select('branch_order', 'tree_id')
    .where({"trees.tree_id": treeId})
    .then (data => res.status(200).json({status: 'success', message: data}))
    .catch (err => res.status(401).json({status: 'error', message: err}));
}

exports.getBranchName = (req, res) => {
    const {branchId} = req.params;

    if (!branchId) {
        return res.status(401).json({status: 'error', message: 'missing branchId'}); 
    }

    knex('branches')
    .select('branch_name', 'branch_id')
    .where({"branch_id": Number(branchId)})
    .then (data => res.status(200).json({status: 'success', message: data}))
    .catch (err => res.status(401).json({status: 'error', message: err}));
}

exports.saveBranchOrder = (req, res) => {
    const {treeId} = req.params;

    if (!treeId) {
        return res.status(401).json({status: 'error', message: 'missing treeId'}); 
    }

    const {branchOrder, branchNames} = req.body;

    console.log(`knex-commands.js saveBranchOrder treeId, branchOrder`, treeId, branchOrder);

    knex('trees')
    .update({branch_order: branchOrder})
    .where({"trees.tree_id": treeId})
    .then (data => res.status(200).json({status: 'success', message: data}))
    .catch (err => res.status(401).json({status: 'error', message: err}));
}

exports.saveBranchName = (req, res) => {
    const {branchId, branchName} = req.body;

    if (!branchId || !branchName) {
        return res.status(401).json({status: 'error', message: 'missing data'}); 
    }

    const {branchOrder, branchNames} = req.body;

    console.log(`knex-commands.js saveBranchName branchId, branchName`, branchId, branchName);

    knex('branches')
    .update({branch_name: branchName})
    .where({"branch_id": branchId})
    .then (data => res.status(200).json({status: 'success', message: data}))
    .catch (err => res.status(401).json({status: 'error', message: err}));
}