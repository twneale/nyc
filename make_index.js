var basedir = (process.argv[2] || '.') + '/';

var finder = require('findit')(basedir),
    path = require('path'),
    et = require('elementtree'),
    cheerio = require('cheerio'),
    fs = require('fs');

// map section numbers to filename

var section_index = { };
var section_parents = { };
var section_children = { };

// scan code directory

var title_shards = { };

finder.on('directory', ondirectory)
    .on('file', onfile)
    .on('end', done);

function ondirectory(dir, stat, stop) {
    var base = path.basename(dir);
    if (base === '.git' || base === 'node_modules') stop();
}

// functions

function parse_xml_file(file) {
    try {
        var html = fs.readFileSync(file).toString(); // not sure why toSting is needed to make a string
        return cheerio.load(html);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log('File not found!');
        } else {
          throw e;
        }
    }
}

function onfile(file, stat) {
    // run a specific file by putting it on the command line
    if (file.match(/\.html/)) {
        // parse file
        var dom = parse_xml_file(file);
        
        if (!dom("pre")) return;   //For the NYC Code that exists right now, the actual content is wrapped in a <pre> element  
        
        // remember the file name for each section
        var file_info = get_file_info(dom, file);
        section_index[file_info[0]] = [file_info[1], file_info[2]];

        // make an ordered list of children of each parent
        section_children[file_info[0]] = [];

        // map children to parents


    if (file.match(/index\.html/)) {
        find_children(dom, function (node) {
            var link = node.attr('href')
            if (link != undefined) {
                if (link != "t1/index.html") {
                    var child_dom = parse_xml_file(link.replace(/\/ny\//,"nycode/"));
                    var child_info = get_file_info(child_dom, link.replace(/\/ny\//,"nycode/"));
                    section_parents[child_info[0]] = file_info[0];
                    section_children[file_info[0]].push(child_info[0]);
                }
            } else {
                console.log(file + ": is an index with dead links")
            }
        })
    }
}
}

function find_children(node, func) {
    func(node("li").find("a"))
}

function get_file_info(dom, file) {
    // the part that gets the id is duplicated in render_body.js

    var fn = file.substring(basedir.length).replace("..",".");
    var id = fn.replace(/(\.)+html/, "");
    var output_fn = fn;
    output_fn = "sections/" + path.basename(fn);

    return [id, fn, output_fn]; // id = the section number, fn = the filename (.html), output_fn = where it lives sections/{fn}.html
}

function done() {
//    console.log(section_parents)
    fs.writeFileSync(basedir + "section_index.json", JSON.stringify(section_index));
    fs.writeFileSync(basedir + "section_parents_index.json", JSON.stringify(section_parents));
    fs.writeFileSync(basedir + "section_children_index.json", JSON.stringify(section_children));
    console.log("Done")
}