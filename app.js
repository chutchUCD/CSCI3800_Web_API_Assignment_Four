var Usergrid = require('usergrid')


var express = require('express')
var bpar = require('body-parser')
var sanitize = require('sanitizer')
/*
A note about access.
Using the 2.0 web app I couldn't access my database without using a username.
So right now that's stored in a vault that's being called here.
*/
var vault= require('avault').createVault(__dirname)
var app=express() , PORT=3000
app.use(bpar.json())

vault.get('credentialVault', function(credstr){
var cred = JSON.parse(credstr)

Usergrid.init(
{
    orgId:"chutch",
    appId:"movies",
    baseUrl:"https://apibaas-trial.apigee.net/"
})

/* //The hard part: getting this to work on a dead server call.

Usergrid.authenticateApp(function(err, usergridResponse, t){
    if(err){
        console.log(err)
    }else{
        console.log("Non error response:")
        console.log(t)
        console.log("user:")
        Usergrid.GET("movies", function(err, ugr, ent){
        
        if(err){
            console.log("Err function.")
            console.log(err)
        }else{
            console.log("here")
            console.log(ugr)
            console.log('entity')
            console.log(ent)
        }
    })
    }
})

*/


function moviesList(req, res){
    Usergrid.authenticateUser(cred, function(err, ugr, t){
    if(err){
        console.log(err)
    }else{
        Usergrid.GET( "movies",    
        function(e, qrsp, movies){
        if (e){
                console.log(e)
                console.status(500).send("Internal Server Error, can't read films list.")
            } else{
                data_list = []
                console.log(movies)
                console.log(typeof(movies))
                if(!movies.length){
                    res.json(sanitizeFilm(movies))
                } else{
                    movies.forEach(function(each){
                        data = {}
                        data = sanitizeFilm(each)
                        data_list.append(data)
                    })
                    res.json(data_list)
                }
            }
        })
    }
    })
}

function sanitizeFilm(entity){
    obj = {}
    obj.title = entity.mtitle
    obj.year = entity.myear
    obj.actors = entity.mactor
    return obj
}

function moviesTitle(req, res){
    if (!req.query==={} || !req.query.title){
        res.status(400).send("Bad request, no recognized query. I use title=your_film")
    }else{
        qtitle=sanitize.sanitize(req.query.title)
        Usergrid.authenticateUser(cred, function(err, ugr, t){
        //Make sure to keep this code nearby.
        var UQuery = require('usergrid/lib/query')
        var q = new UQuery('movies').eq('mtitle', qtitle)

        
        
    if(err){
        console.log(err)
    }else{

        Usergrid.GET( q,    
        function(e, qrsp, movies){
        if (e){
                console.log(e)
                console.status(500).send("Internal Server Error, can't read films list.")
            } else{
                    if (!qrsp.first){
                        res.status(204).send("No film found")
                    }else{
                    data_list = []
                    if(!movies.length){
                        res.json(sanitizeFilm(movies))

                    } else{
                        movies.forEach(function(each){
                            data = sanitizeFilm(each)
                            data_list.append(data)
                        })
                        res.json(data_list)
                    }}
                    
                }
        })
    }
        
    })}
}

function checkAddInfo(candidate){
    var rt = {}
    rt.mtitle = sanitize.sanitize(candidate.title)
    if(!rt.mtitle){
        console.log('one')
        return false;
    }
    rt.myear = sanitize.sanitize(candidate.year)
    if (!rt.myear){
        console.log('two')
        return false;
    }
    console.log()
    if(!candidate.actors){
        console.log('three')
        return false;
    }
    //dirty check for an array
    if( !candidate.actors.length ){
        return false;
    }
    rt.mactors=[]
    candidate.actors.forEach(function(each){
        var sanitized = sanitize.sanitize(each)
        if(sanitized.length){
            rt.mactors.push(each)
        }
    })
    if (rt.mactors.length<3){
        return false;
    }
    return rt;
}

function moviesAdd(req, res){
    if (!req.body.title){
        res.status(400).send("Could not find title.")
        return;
    }
    var movie = checkAddInfo(req.body)
    if(!movie){
        res.status(400).send("Misformed request. Needs title, a year, and an array of actors at least 3 long.")
    } else {
        Usergrid.authenticateUser(cred, function(err, ugr, t){
    if(err){
        console.log(err)
    }else{
        //this points the movie to the correct collection on apigee.
        var UQuery = require('usergrid/lib/query')
        var q = new UQuery('movies').eq('mtitle', movie.mtitle)
        Usergrid.GET(q, function(e, qrsp, ent){
            if (e){
                console.log(e)
                console.status(500).send("Internal Server Error, can't read films list.")
                return
            }
            if (qrsp.first){
                res.status(403).send("Adding an existing film. This action forbidden.")
                return
            }else{
            movie.type='movies'
            Usergrid.POST( movie,
            function(e, qrsp, movies){
            if (e){
                    console.log(e)
                    console.status(500).send("Internal Server Error, can't read films list.")
                } else{ 
                       res.status(qrsp.statusCode).send("Movie added")
                }
            })//end of post
            }
        })//end of get
        
    }
        
    })}
}

function deleteByTitle(req, res){
    if (!req.body.title){
        res.status(400).send("Could not find title.")
        return;
    }
    //hacking so I don't have to rewrite code.
    var movie={}
    movie.mtitle = sanitize.sanitize(req.body.title)
    if(!movie.mtitle){
        res.status(400).send("Misformed request. Needs title, a year, and an array of actors at least 3 long.")
    } else {
        Usergrid.authenticateUser(cred, function(err, ugr, t){
    if(err){
        console.log(err)
    }else{
        //this points the movie to the correct collection on apigee.
        var UQuery = require('usergrid/lib/query')
        var q = new UQuery('movies').eq('mtitle', movie.mtitle)
        Usergrid.GET(q, function(e, qrsp, ent){
            if (e){
                console.log(e)
                console.status(500).send("Internal Server Error, can't read films list.")
                return
            }
            //make sure it exists.
            if (!qrsp.first){
                res.status(403).send("Could not find an item to delete.")
                return
            }else{
            target = qrsp.first.uuid
            Usergrid.DELETE( "movies", target,
            function(e, qrsp, movies){
            if (e){
                    console.log(e)
                    console.status(500).send("Internal Server Error, can't read films list.")
                } else{ 
                       res.status(qrsp.statusCode).send("Movie deleted")
                }
            })//end of post
            }
        })//end of get
        
    }        
    })}
}

    
app.get('/movieslist', function(req,resp){
    
    moviesList(req, resp)
    
})

app.get('/moviestitle', function(req,resp){
    
    moviesTitle(req, resp)
    
})

app.post('/addmovie', function(req,resp){
    moviesAdd(req, resp)
    
})

app.delete('/deletemovie', function(req,resp){
    deleteByTitle(req,resp)
})

app.listen(PORT, function(){
    console.log("Listening")
})


})//credentials for in app authentication defined here.