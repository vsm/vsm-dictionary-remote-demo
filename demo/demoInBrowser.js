/*
NOTE!: This only works with Webpack.
Start the demo by running `npm run demo`.

The Webpack development-server bundles all modules, which are Node.js-based,
so they can run in the browser instead. The bundled JS-script will expose a
global variable `VsmDictionaryRemoteDemo` that can be accessed by this script.

Webpack serves the bundle in-memory (so, writing no files to disk), along with
an updated demo.html webpage that loads both that bundle and this demo-script.
*/


// In the browser, Webpack lets us access `VsmDictionaryRemoteDemo` as
// a global variable.
/* global VsmDictionaryRemoteDemo */  // Prevent ESLint error.
runDemo();


var matchesMaxCount = 20;


function runDemo() {
  // Remove the warning message of running this demo without Webpack.
  if (VsmDictionaryRemoteDemo)  document.getElementById('demo').innerHTML = '';

  makeDemoRemote();
}


function makeDemoRemote() {
  // 1. Make a subclass of DictionaryRemoteDemo, that adds a layer of code
  // that parses the specific data that pubdictionaries.org returns.
  class DictionaryPubDictionaries extends VsmDictionaryRemoteDemo {
    constructor(options) {
      super(options);
      this.urlGetMatches = 'http://pubdictionaries.org' +
        '/dictionaries/$filterDictID/prefix_completion?term=$str';
    }
    getMatchesForString(str, options, cb) {
      super.getMatchesForString(str, options, (err, res) => {
        if (err)  return cb(err);
        var arr = res.items.map(e => e.type ?
          e :  // Don't convert N/R match-objects generated by parent class.
          ({
            id:     e.identifier,
            dictID: options.filter.dictID[0],
            str:    e.label,
            type:   e.label.startsWith(str) ? 'S' : 'T',
            /*
            z: {
              dictionary_id: e.dictionary_id,
              id: e.id,
              label_length: e.label_length,
              mode: e.mode,
              norm1: e.norm1,
              norm2: e.norm2,
              created_at: e.created_at,
              updated_at: e.updated_at
            } //*/
          })
        );
        cb(err, {items: arr});
      });
    }
  }

  // 2. Make an instance of that subclass.
  var dict = new DictionaryPubDictionaries();

  // 3. Make an interactive demo panel, for querying it with string-search.
  var elems = createDemoPanel({
    title: 'VsmDictionaryRemoteDemo ' +
           '+ a subclass that connects to \'PubDictionaries.org\':<br> ' +
           '&nbsp; demo of (only) its \'getMatchesForString()\' function:<br>',
    dictionary: dict,
    dictID: 'GO-BP',
    initialSearchStr: 'cell b',
  });

  elems.input.focus();
  elems.input.setSelectionRange(0, elems.input.value.length);
}



function createDemoPanel(opt) {
  var parent = document.getElementById('demo');
  if (!parent)  return;

  var title = document.createElement('div');
  var input = document.createElement('input');
  var dictInput = opt.dictID ? document.createElement('input') : false;
  var output = document.createElement('pre');

  title.innerHTML = '&bull; ' + opt.title + '<br>';
  title.setAttribute('style', 'margin: 18px 0 2px -8px; font-size: 12px;');
  output.setAttribute('style',
    'background-color: #fafafa;  border: 1px solid #ddd; '+
    'color: #333;  font-size: 12px;  font-family: Inconsolata, monospace;' +
    'width: 90%;  min-height: 24px;  margin: 2px 0 0 0;  padding: 0 0 1px 0;' +
    'white-space: pre-wrap;'
  );

  if (dictInput) {  // Only add a dictID-inputfield, if a dictID is given.
    dictInput.setAttribute('style', 'margin: 0 0 0 10px; width: 60px');
    dictInput.setAttribute('placeholder', 'dictID');
    dictInput.value = opt.dictID;
    dictInput.addEventListener('input', function () {
      input.dispatchEvent(new Event('input', {}));  // Make the main input fire.
    });
  }

  parent.appendChild(title);
  parent.appendChild(input);
  if (dictInput)  parent.appendChild(dictInput);
  parent.appendChild(output);

  input.addEventListener('input', function () {
    getNewMatches(
      opt.dictionary, this.value, searchOptionsFunc(), input, dictInput, output
    );
  });

  input.setAttribute('value', opt.initialSearchStr);
  getNewMatches(
    opt.dictionary, input.value, searchOptionsFunc(), input, dictInput, output
  );

  var ans = {input: input};
  if (dictInput)  ans.dictInput = dictInput;
  return ans;

  function searchOptionsFunc() {
    var ans = { perPage: matchesMaxCount };
    if (dictInput) {
      ans.filter = { dictID: [dictInput.value] };  // Always uses latest value.
    }
    return ans;
  }
}



function getNewMatches(dict, str, options, input, dictInput, output) {
  dict.getMatchesForString(str, options, function (err, res) {
    if (err)  { output.innerHTML = 'Error: ' + err;  return }
    for (var i = 0, s = '';  i < res.items.length;  i++) {
      s += matchToString(res.items[i]) + '\n';
    }
    // Place the results, but only if the inputs haven't changed yet.
    if (input.value == str  &&  ( !dictInput || 
        dictInput.value == options.filter.dictID[0] )) {
      output.innerHTML = s;
    }
  });
}



function matchToString(m) {
  var n = '</span>';
  var arr = [
    'type:\''   + m.type,
    'dictID:\'' + m.dictID,
    'id:\'<span style="font-weight:800; color:#737373">' + m.id  + n,
    'str:\'<span style="font-weight:800; color:#a00">'   + m.str + n,
  ];
  if (m.style)  arr.push('style:\'<span style="color:#66e">' + m.style + n);
  if (m.descr)  arr.push('descr:\'<span style="color:#772">' + m.descr + n);
  if (m.z    )  arr.push('z:\'<span style="color:#db8">' +
    JSON.stringify(m.z) + n);
  if (m.terms)  arr.push('terms:<span style="color:#bbb">' +
    JSON.stringify(m.terms)
      .replace(/"str"/g, 'str')
      .replace(/"style"/g, 'style')
      .replace(/"descr"/g, 'descr') +
    n);

  return '{' + arr.join('\', ') + '\'}';
}
