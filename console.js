const fork = require('child_process').fork;
var fs = require('fs');
var readline = require('readline');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
var psTree = require('ps-tree');
var child;
var proxy_running = false;

function blacklist_load(command,callback){
    fs.readFile('blacklist.json', function(err, content){
        if(err){
            console.log(err)
            return;
        }
        else{
            callback(command,JSON.parse(content))
        }
    });
}

var blacklist = function(sites,bl){
    if(sites[1]==="-rm"){
        if(bl[sites[2]]){
            delete bl[sites[2]]
        }
        fs.writeFile('blacklist.json',JSON.stringify(bl), function(err){
            console.log("Removed from blacklist: ",sites[2])
        });
    }
    else if(sites[1]==="show"){
        for(var i =0; i<bl.length; i++){
            count = i+1;
            console.log(count+": "+bl[i]);
        }
    }
    else{
        if(!bl[sites[1]]){
            bl[sites[1]] = true;
        }
        fs.writeFile('blacklist.json',JSON.stringify(bl), function(err){
            console.log("Website added to blacklist: ",sites[1])
        });
    }
    getCommand();
}


function start(){
    if(proxy_running==false){
        proxy_running = true;
        child = fork('./proxy.js', [], {
        });
        console.log("Proxy Server Started.......")
    }
    else{
        console.log("The proxy is already running...")
    }
    getCommand();
}
function kill_proxy(){
    if(proxy_running==true){
        kill(child.pid);
        console.log("Proxy closed.")
        proxy_running = false;
    }
    else{
        console.log("The Proxy is not turned on.")
    }
    getCommand();
}
function empty_cache(){
    fs.truncate('cache/headers.json', 0, function(){})
    fs.truncate('cache/data.json', 0, function(){})
    getCommand();

}



var kill = function (pid, signal, callback) {
    signal   = signal || 'SIGKILL';
    callback = callback || function () {};
    var killTree = true;
    if(killTree) {
        psTree(pid, function (err, children) {
            [pid].concat(
                children.map(function (p) {
                    return p.PID;
                })
            ).forEach(function (tpid) {
                try { process.kill(tpid, signal) }
                catch (ex) { }
            });
            callback();
        });
    } else {
        try { process.kill(pid, signal) }
        catch (ex) { }
        callback();
    }
};




console.log("WELCOME TO SEANS PROXY SERVER MANAGEMENT CONSOLE :)\n")
getCommand();

function getCommand(){
    rl.setPrompt('command> ');
    rl.prompt();
}

rl.on('line', function(input){
    var command = [];
    command = input.split(' ');
    switch(command[0]){
        case "h": help();
        break;
        case "blacklist": blacklist_load(command,blacklist);
        break;
        case "s": start();
        break;
        case "kill": kill_proxy();
        break;
        case "clean": empty_cache();
        break;
        default: help();
}});



function help(){
    console.log("\nHELPLINE\n")
    console.log("[command] {[option]} {[variables]}\n")
    console.log("blacklist URL {, URL }")
    console.log("\t-Adds websites to blacklist")
    console.log("blacklist -rm URL")
    console.log("\t-Removes website from blacklist")
    console.log("blacklist show")
    console.log("\t-Displays blacklist\n")
    console.log("s")
    console.log("\t-Starts proxy server\n")
    console.log("kill")
    console.log("\t-Closes proxy server\n")
    console.log("clean")
    console.log("\t-Clears the cache\n")
    getCommand();
}
