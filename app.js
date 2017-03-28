/*
* Emerging technologies
* Paris Dauphine
*
* WARNING :
*   - console.log is used in this example to follow-up progression. Though, It is not a best practice for production apps :-) !
*   - Application here are implemented under the 'happy path' for the sake of clarity. It means that very limited of error traps are made.
*/

var express = require("express");
var bodyParser = require("body-parser");
//Creates an Express application
var app = express();
// Express usage of Static file - css , image
app.use(express.static("./public"));
//Enable the parser in order to interpret the POST to retrieve data
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());
////////////////////////////////////////////////////////////////////////////////
//WATSON : Add the library module and credentials
var watson = require("watson-developer-cloud");
var language_translation = watson.language_translation({
	url: "https://gateway.watsonplatform.net/language-translator/api",
	username: "e7bc8620-56eb-4c9c-823d-589181e8ebd1",
 password: "Iko2d31dlppJ",
	version: "v2"
});
var traduction;

//Personality
var personality_insights = watson.personality_insights({
// ADD CODE HERE
url: "https://gateway.watsonplatform.net/personality-insights/api",
 username: "3fbf5d0c-977b-4fb8-a4fe-5979d5e6d186",
 password: "h57O8B53Gvu8",
 version: "v2"
});

var personality;
////////////////////////////////////////////////////////////////////////////////
//CLOUDANT
var Cloudant = require("cloudant");
var me = "3fbf5d0c-977b-4fb8-a4fe-5979d5e6d186"; // Set this to your own account
var password = "h57O8B53Gvu8";// Set this to your own account
var cloudant = Cloudant({
	username: "63ea6950-c21c-4ea4-9fab-215bead9c305-bluemix",
 password: "357821db161302fe47922a7866f0f78ee48e31797ea001c1a407d5aa5222f867",
 host: "63ea6950-c21c-4ea4-9fab-215bead9c305-bluemix.cloudant.com",
 port: 443,
 url: "https://63ea6950-c21c-4ea4-9fab-215bead9c305-bluemix:357821db161302fe47922a7866f0f78ee48e31797ea001c1a407d5aa5222f867@63ea6950-c21c-4ea4-9fab-215bead9c305-bluemix.cloudant.com"
});
//var cloudant = Cloudant("https://63d714a1-ba3a-4a0a-9a18-dda46570d81e-bluemix:d79f900671ce0286dd257541a4d8744ba2e071d379d437da3048a34aa33bf17c@63d714a1-ba3a-4a0a-9a18-dda46570d81e-bluemix.cloudant.com");

/* Cloudant : Optional code to list all the database for this connection
cloudant.db.list(function(err, allDbs) {
console.log('All my databases: %s', allDbs.join(', '))
});
*/
//PRE Requisite : The Cloudant database mybooks should be created in CLOUDANT
// Remark : Work is done on the remote database. No replication enabled.
var mybooksdb = cloudant.use("mybooks");
/*Cloudant : Optional code to list all the database indexes
mybooksdb.index(function(er, result) {
if (er) {
throw er;
}
console.log('The database has %d indexes', result.indexes.length);
for (var i = 0; i < result.indexes.length; i++) {
console.log('  %s (%s): %j', result.indexes[i].name, result.indexes[i].type, result.indexes[i].def);
}});
*/

var thebookslist = [];
mybooksdb.find({
	selector: {
		type: "book"
	}
}, function(er, result) {
	if (er) {
		throw er;
	}
	thebookslist = result.docs;
	//console.log('Found %d books in documents', result.docs.length);
});

////////////////////////////////////////////////////////////////////////////////
//EXPRESS Routes definition
//Express Route : GET at the root page. Display the Booklist and Book creation page
app.get("/", function(req, res) {
	// The collection of books is computed to rely on fresh data
	mybooksdb.find({
		selector: {
			type: "book"
		}
	}, function(er, result) {
		if (er) {
			throw er;
		}
		thebookslist = result.docs;
		console.log("OPEN main page with %d books", result.docs.length);
		res.render("./pages/mainpage.ejs", {
			booklist: thebookslist
		});
	});
});

//Express Route : POST to add a book to the collection
app.post("/book/add/", function(req, res) {
	mybooksdb.insert(req.body);
	console.log("Book added");
	res.redirect("/");
});

//Express Route : GET to remove a book from a collection the collection : ID and revision are required
app.get("/book/remove/:id/:rev", function(req, res) {
	if (req.params.id !== "") {
		mybooksdb.destroy(req.params.id, req.params.rev);
		console.log("Book removed");
		res.redirect("/");
	}
});

//Express Route : GET to open the details of a book
//Remark: For the example the data are retrieved from the database to demonstrate the "get" on ID primitive
app.get("/book/open/:id", function(req, res) {
	mybooksdb.get(req.params.id, {
		include_doc: true
	}, function(err, body) {
		if (!err) {
			res.render("./pages/bookdetails.ejs", {
				booklist: body
			});
			console.log("OPEN Book details");
		} else {
			res.redirect("/");
		}
	});
});

//Express Route : GET to open the translation of a book summary
//Remark: For the example the data are retrieved from the database to demonstrate the "get" on ID primitive
app.get("/book/translate/:id", function(req, res) {
	mybooksdb.get(req.params.id, {
		include_doc: true
	}, function(err, body) {
		if (!err) {
			language_translation.translate({
					text: body.booksummary,
					source: "fr",
					target: "en"
				},
				function(err, translation) {
					if (err)
						console.log("error:", err);
					else
						traduction = translation;
					console.log("TRANSLATE the Book");
					language_translation.identify({
							text: body.booksummary
						},
						function(err, language) {
							languagedetection = language;
							console.log("IDENTIFY the Language");
							res.render("./pages/booktranslate.ejs", {
								booklist: body,
								transsummary: traduction,
								langdetection: languagedetection
							});
						});
				});
		} else {
			res.redirect("/");
		}
	});
});
//Express Route : GET to open the personality insight of the author
//Remark: Personality takes EN as input. so Bio should be first translated
app.get("/book/personality/:id", function(req, res) {
	mybooksdb.get(req.params.id, {
		include_doc: true
	}, function(err, body) {
		if (!err) {
			language_translation.translate({
					text: body.authorquote,
					source: "fr",
					target: "en"
				},
				function(err, translation) {
					if (err)
						console.log("error:", err);
					else
						traduction = translation;
					console.log("TRANSLATE IN ENGLISH the Book");
					personality_insights.profile({
							text: traduction.translations[0].translation
						},
						function(err, response) {
							if (err)
								console.log("error:", err);
							else
								personality = response;

							res.render("./pages/authorpersonality.ejs", {
								booklist: body,
								authorpersonality: personality
							});
							console.log("OPEN Author Personality details");

						});
				});
		} else {
			res.redirect("/");
		}
	});
});

////////////////////////////////////////////////////////////////////////////////
//EXPRESS Routes definition
//Express Route : API Management
app.get("/api/all_books", function(req, res) {
	// The collection of books is computed to rely on fresh data
	mybooksdb.find({
		selector: {
			type: "book"
		}
	}, function(er, result) {
		if (er) {
			throw er;
		}
		res.writeHead(200, {
			"Content-Type": "application/json"
		});
		res.end(JSON.stringify(result.docs));
		console.log("API Call Allbooks : %d books returned", result.docs.length);
	});
});

app.get("/api/book/:id", function(req, res) {
	// The collection of books is computed to rely on fresh data
	mybooksdb.get(req.params.id, {
		include_doc: true
	}, function(err, body) {
		if (!err) {
			res.writeHead(200, {
				"Content-Type": "application/json"
			});
			res.end(JSON.stringify(body));
			console.log("API Call 1 book ID: %d books returned", req.params.id, body.booktitle);
		} else {
			res.end("{error: \"No Books\" }");
			console.log("API Call 1 book: No Book fond");
		}
	});
});

app.post("/api/book/add/", function(req, res) {
	mybooksdb.insert(req.body);
	console.log("API Call Book added");
	res.writeHead(201, {
		"Content-Type": "application/json"
	});
	res.end("{status: \"1 Book added\" }");
});

app.delete("/api/book/remove/:id/:rev", function(req, res) {
	if (req.params.id !== "") {
		mybooksdb.destroy(req.params.id, req.params.rev);
		res.writeHead(200, {
			"Content-Type": "application/json"
		});
		console.log("API Call Book removed");
		res.end("{status: \"1 Book removed\" }");
	}
});


//Express Route : No route Found : It is a 404
app.use(function(req, res, next) {
	res.status(404);
	res.send("404! File not found");
});

// Defining the Server - Please note the 'cloud enabled' variable
var host = '0.0.0.0';
var port =  process.env.PORT || 8080;
var server = app.listen(port, host);

console.log("*******************************************************************");
console.log("**    Paris Dauphine - Emerging technologies");
console.log("**    Server ready for business at http://%s:%s", host, port);
console.log("*******************************************************************");
