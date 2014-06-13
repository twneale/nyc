var basedir = (process.argv[2] || '.') + '/';
var finder = require('findit')(basedir)

var fs = require("fs");
var path = require("path")
var rr = require('readdir-recursive');
var _ = require("underscore");
var et = require('elementtree');
var cheerio = require('cheerio');
var mkdirp = require('mkdirp');
var beautify_html = require('js-beautify').html;

// function run () {
// 	//Open the directory and, for each file, parse the reg
// 	rr.file(basedir, function(file) {
// 		readReg(file, function () {
// 		});
// 	})
// } 

finder.on('directory', ondirectory)
    .on('file', onfile)
    .on('end', done);

function ondirectory(dir, stat, stop) {
    var base = path.basename(dir);
    if (base === '.git' || base === 'node_modules') stop();
}


// function test () {
// 	readReg("./nycode/ADC/t8/c8/s8-803/8-803..html", function () {
// 		console.log("Done!")
// 	})
// }

function parse_xml_file(file) {
    try {
        var xml = fs.readFileSync(file).toString(); // not sure why toSting is needed to make a string
        return cheerio.load(xml);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log('File not found!');
        } else {
          throw e;
        }
    }
}

function onfile (f, stat) {
	//For the file, read the text and fire off the parser
	if (path.basename(f) != "index.html") {
		var fname = path.basename(f, '.html').replace(/\.$/,"")
		var dir = path.dirname(f).replace('nycode',"")
		mkdirp.sync("nyc-xml/" + dir)
		var out = parse_xml_file(f);
		// Combine the lines together
		buildRegTree(out("pre").text(), fname, function (rt) {
			fs.writeFileSync("./nyc-xml/" + dir + "/" + fname + ".xml", beautify_html(rt, {indent_size: 2}), {encoding:"utf8"})
		})
	}
	else if (path.basename(f) == "index.html") {
		var dir = path.dirname(f).replace('nycode',"")
		mkdirp.sync("nyc-xml/" + dir)
		var out = parse_xml_file(f);
		buildIndex(out, dir, function (idx){
			fs.writeFileSync("./nyc-xml/" + dir + "/index.xml", beautify_html(idx, {indent_size: 2}), {encoding:"utf8"})
		})
	}
}

function buildIndex (idx, dir, callback) {
	// body...
	var XML = et.XML;
	var ElementTree = et.ElementTree;
	var element = et.Element;
	var subElement = et.SubElement;
	var root, etree, level, sublevel, xml;

	var title = idx("h1").text().trim().split(" - ")
	var title_num = title[0].split(' ')

	//Initialize the tree
	var root = element("level");
	subElement(root, "type").text = "toc";
	subElement(root, "prefix").text = title_num[0];
	subElement(root, "num").text = title_num[1];
	subElement(root, "heading").text = title[1];

	idx("a", "ul").each(function (i, node) {
		url = idx(this).attr('href').replace('html','xml').replace('..','.').replace('/ny' +  dir + '/','').replace("*","_")
		console.log([dir, url])
		
		subElement(root, "{http://www.w3.org/2001/XInclude}include").attrib["href"] = url
	})
	etree = new ElementTree(root);
	xml = etree.write({'xml_declaration': false});
	callback(xml)

}

function combineLines (txt, callback) {
	var combined = txt.replace(/([^\s])(\n)([^\n])/g, "$1");
	
	//Clean up double-spaces
	while (combined.match(/  /g)) {
		combined = combined.replace(/  /g," ")
	}
	// Clean up leading whitespace
	while (combined.match(/\n\s/g)) {
		combined = combined.replace(/\n\s/g,"\n")
	}
	//Clean up double lines
	while (combined.match(/\n\s?\n/g)) {
		combined = combined.replace(/\n\s?\n/g,"\n")
	}
	callback(combined)
}

function buildRegTree (r, name, callback) {
	var XML = et.XML;
	var ElementTree = et.ElementTree;
	var element = et.Element;
	var subElement = et.SubElement;
	var root, etree, level, sublevel, xml;

	//Initialize the tree
	var root = element("level");
	subElement(root, "type").text = "section";
	subElement(root, "num").text = name;

	//Now we traverse the tree
	var section = r.trim()
	try {
		subElement(root,"heading").text = section.match(/(\d+\-\d+((\.\d+)+)?)(\.)?(.[\s\S]*?\.)/mi)[0].replace(/\n/,"").replace(/(\d+\-\d+((\.\d+)+)?)(\.)?/,"").trim()
	} catch (e) {
		fs.appendFileSync("error.log","Error for: " + name + " = " + e + "\n")
	}
	subElement(root,"text").text = section;
//	var lines = r.split(/\n/)

/*	_.each(lines, function (line, index, err) {
		if (index == 0) {
			// Ignore the first line
		} else if (index == 1) {
			// The second line is the section header 
			subElement(root, "heading").text = line
		} else if (line.match(/^(\d+\.\d+)/)) {
			// This is a subsection
			var level = subElement(root, "level");
			var num = et.Element("num")
			num.text = line.match(/^(\d+\.\d+(\.)?)/)[0]
			level.append(num)
			var text = et.Element("text");
			text.text = line.replace(/^(\d+\.\d+\.)/,"");
			level.append(text);
*///		} else if (line.match(/^\(\w\).*/g)) {
/*			// This is a paragraph or a subparagraph
			// TODO: Differentiate between the two...
			var sublevel = et.Element("level");
			var num = et.Element("num")
			num.text = line.match(/^\(\w\)/)[0]
			sublevel.append(num)
			var text = et.Element("text");
			text.text = line.replace(/^\(\w\)/,"");
			sublevel.append(text);
			level = root.getchildren()[root.getchildren().length-1];
			level.append(sublevel)
		} else if (line.match(/^[A-Z]+\:/) || line.match(/^[A-Z]{2}.*\:/)) {
			// Annotation
			var note = et.Element("level")
			var head = et.Element("heading")
			head.text = line.match(/^[A-Z].*\:/)[0].replace("\:","")
			note.append(head);
			var text = et.Element("text");
			text.text = line.replace(/[A-Z].*\:/,"");
			note.append(text);
			anno.append(note);
		} else if (line == "") {
			//Skip the line
*///		} else if (line.match(/^.*/)) {
/*			var level = root.getchildren()[root.getchildren().length-1]
			var text = et.Element("text")
			text.text = line
			level.append(text)
			root.insert(root.getchildren().length-1, level)
		} else {
			//Uncaught
			console.log(name + ": line " + index + " -- " + line);
		}
	})
*/
//	root.append(anno)
	etree = new ElementTree(root);
	xml = etree.write({'xml_declaration': false});
	callback(xml)
}
function done() {
    console.log("Done")
}