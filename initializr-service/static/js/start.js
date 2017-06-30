(function () {

  Versions = function () {
  };

  var strict_range = /\[(.*),(.*)\]/,
    halfopen_right_range = /\[(.*),(.*)\)/,
    halfopen_left_range = /\((.*),(.*)\]/,
    qualifiers = ['M', 'RC', 'BUILD-SNAPSHOT', 'RELEASE'];

  Versions.prototype.matchRange = function (range) {
    var strict_match = range.match(strict_range),
      hor_match = range.match(halfopen_right_range),
      hol_match = range.match(halfopen_left_range);
    if (strict_match) {
      return function (version) {
        return compareVersions(strict_match[1], version) <= 0
            && compareVersions(strict_match[2], version) >= 0;
      };
    }
    if (hor_match) {
      return function (version) {
        return compareVersions(hor_match[1], version) <= 0
            && compareVersions(hor_match[2], version) > 0;
      };
    }
    if (hol_match) {
      return function (version) {
        return compareVersions(hol_match[1], version) < 0
            && compareVersions(hol_match[2], version) >= 0;
      };
    }

    return function (version) {
      return compareVersions(range, version) <= 0;
    };
  };

  function parseQualifier(version) {
    var qual = version.replace(/\d+/g, "");
    return qualifiers.indexOf(qual) !== -1 ? qual : "RELEASE";
  }

  function compareVersions(a, b) {
    var result, i,
      versionA = a.split("."),
      versionB = b.split("."),
      aqual = parseQualifier(versionA[3]),
      bqual = parseQualifier(versionB[3]);

    for (i = 0; i < 3; i++) {
      result = parseInt(versionA[i], 10) - parseInt(versionB[i], 10);
      if (result !== 0) {
        return result;
      }
    }
    result = qualifiers.indexOf(aqual) - qualifiers.indexOf(bqual);
    if (result !== 0) {
      return result;
    }
    return versionA[3].localeCompare(versionB[3]);
  }

  /**
   * Parse hash bang parameters from a URL as key value object.
   * For repeated parameters the last parameter is effective.
   * If = syntax is not used the value is set to null.
   * #!x&y=3 -> { x:null, y:3 }
   * @param url URL to parse or null if window.location is used
   * @return Object of key -> value mappings.
   * @source https://gist.github.com/zaus/5201739
   */
  hashbang = function (url, i, hash) {
    url = url || window.location.href;

    var pos = url.indexOf('#!'),
      vars = [],
      hashes = url.slice(pos + 2).split('&');

    if (pos < 0) { return []; }

    for (i = hashes.length; i--;) {
      hash = hashes[i].split('=');
      vars.push({name: hash[0], value: hash.length > 1 ? hash[1] : null});
    }

    return vars;
  };

  applyParams = function () {
    var params = hashbang();
    $.each(params, function (index, param) {
      var value = decodeURIComponent(param.value);
      switch (param.name) {
        case 'type':
        case 'packaging':
        case 'javaVersion':
        case 'language':
          $('.' + param.name.toLowerCase() + '-form-group').removeClass("hidden");
          $('#' + param.name + ' option[value="' + value + '"]').prop('selected', true);
          $('#' + param.name).change();
          break;
        case 'groupId':
        case 'artifactId':
        case 'name':
        case 'description':
        case 'packageName':
          $('.' + param.name.toLowerCase() + '-form-group').removeClass("hidden");
          $('#' + param.name).val(value);
          $('#' + param.name).change();
          break;
      }
    });
  }

}());

var allDependencies = {};
var selectedDepIds = new Set();

function fetchAllDependencies() {
  $.getJSON("/dependencies", function (data) {
    allDependencies = data.dependencies;
  });
}
function quote(text) {
  return "'" + text + "'";
}
function renderDependencyGradle(dep) {
  return dep.scope + " " + quote(dep.groupId + ':' + dep.artifactId + (dep.version ? ':' + dep.version : ''));
}
function renderDependencyMaven(dep) {
  return "<dependency>\n" +
          "  <groupId>"+dep.groupId+"</groupId>\n" +
          "  <artifactId>"+dep.artifactId+"</artifactId>\n" +
      (dep.version ? "  <version>" + dep.version + "</version>\n" : "") +
          "  <scope>"+dep.scope+"</scope>\n" +
          "</dependency>\n";
}
function depFor(depId) {
  return allDependencies[depId];
}
function addToSelectedDeps(depId) {
  selectedDepIds.add(depId);
  reRender();
}
function removeFromSelectedDeps(depId) {
  selectedDepIds.delete(depId);
  reRender();
}
function reRender() {
  renderDepsGradle();
  renderDepsMaven();
}
function renderDepsGradle() {
  renderDepsBuildType("gradle", renderDependencyGradle);
}
function renderDepsMaven() {
  renderDepsBuildType("maven", renderDependencyMaven);
}
function renderDepsBuildType(typeName, renderFn) {
  var selectedDeps = _.map(Array.from(selectedDepIds), depFor);
  var selectedDepTexts = _.map(selectedDeps, renderFn);
  var deps = _.reduce(selectedDepTexts, function(text, item) {
    return text + item + "\n";
  }, "");

  var hlObj = hljs.highlightAuto(deps);
  var block = $("#deps-view-"+typeName);
  block.html(hlObj.value);
}
function toggleDepsTab(typeValue) {
  var isMaven = (typeValue === "maven-project");
  $("#deps-view-gradle-outer").toggleClass("hidden", isMaven);
  $("#deps-view-maven-outer").toggleClass("hidden", !isMaven);
}

function setupButtonsForTooltips() {
  var i;
  var btns = document.querySelectorAll('.deps-block button');
  for (i = 0; i < btns.length; i++) {
    btns[i].addEventListener('mouseleave', function (e) {
      e.currentTarget.setAttribute('class', 'cpbtn');
      e.currentTarget.removeAttribute('aria-label');
    });
  }
}

function initClipboard() {
  setupButtonsForTooltips();
  var clipboard = new Clipboard('.deps-block button');
  clipboard.on('success', function(e) {
    e.clearSelection();
    showTooltip(e.trigger, 'Copied!');
  });
}

function showTooltip(elem, msg) {
  elem.setAttribute('class', 'cpbtn tooltipped tooltipped-s');
  elem.setAttribute('aria-label', msg);
}


$(function () {
  fetchAllDependencies();
  initClipboard();

  if (navigator.appVersion.indexOf("Mac") !== -1) {
    $(".btn-primary").append("<kbd>&#8984; + &#9166;</kbd>");
  }
  else {
    $(".btn-primary").append("<kbd>alt + &#9166;</kbd>");
  }

  var refreshDependencies = function (versionRange) {
    var versions = new Versions();
    $("#dependencies div.checkbox").each(function (idx, item) {
      if ($(item).attr('data-range') === 'null' || versions.matchRange($(item).attr('data-range'))(versionRange)) {
        $(item).show();
      } else {
        $(item).hide();
        $("input", item).prop('checked', false);
      }
    });
  };
  var addTag = function (id, name) {
    if ($("#starters div[data-id='" + id + "']").length === 0) {
      $("#starters").append("<div class='tag' data-id='" + id + "'>" + name +
          "<button type='button' class='close' aria-label='Close'><span aria-hidden='true'>&times;</span></button></div>");
    }
    addToSelectedDeps(id);
  };
  var removeTag = function (id) {
    $("#starters div[data-id='" + id + "']").remove();
    removeFromSelectedDeps(id);
  };
  var initializeSearchEngine = function (engine, bootVersion) {
    $.getJSON("/ui/dependencies.json?version=" + bootVersion, function (data) {
      engine.clear();
      $.each(data.dependencies, function (idx, item) {
        if (item.weight === undefined) {
          item.weight = 0;
        }
      });
      engine.add(data.dependencies);
    });
  };
  refreshDependencies($("#bootVersion").val());
  toggleDepsTab($("#type").val());

  $("#type").on('change', function () {
    $("#form").attr('action', $(this.options[this.selectedIndex]).attr('data-action'))
    toggleDepsTab($(this).val());
  });
  $("#artifactId").on('change', function () {
    $("#baseDir").attr('value', this.value)
  });
  $("#bootVersion").on("change", function (e) {
    refreshDependencies(this.value);
    initializeSearchEngine(starters, this.value);
  });
  $(".tofullversion a").on("click", function () {
    $(".full").removeClass("hidden");
    $(".tofullversion").addClass("hidden");
    $(".tosimpleversion").removeClass("hidden");
    $("body").scrollTop(0);
    return false;
  });
  $(".tosimpleversion a").on("click", function () {
    $(".full").addClass("hidden");
    $(".tofullversion").removeClass("hidden");
    $(".tosimpleversion").addClass("hidden");
    applyParams();
    $("body").scrollTop(0);
    return false;
  });
  var starters = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.nonword('name', 'description', 'keywords', 'group'),
    queryTokenizer: Bloodhound.tokenizers.nonword,
    identify: function (obj) {
      return obj.id;
    },
    sorter: function (a, b) {
      return b.weight - a.weight;
    },
    cache: false
  });
  initializeSearchEngine(starters, $("#bootVersion").val());
  $('#autocomplete').typeahead(
      {
        minLength: 2,
        autoSelect: true
      }, {
        name: 'starters',
        display: 'name',
        source: starters,
        templates: {
          suggestion: function (data) {
            return "<div><strong>" + data.name + "</strong><br/><small>" + data.description + "</small></div>";
          }
        }
      });
  $('#autocomplete').bind('typeahead:select', function (ev, suggestion) {
    var alreadySelected = $("#dependencies input[value='" + suggestion.id + "']").prop('checked');
    if (alreadySelected) {
      removeTag(suggestion.id);
      $("#dependencies input[value='" + suggestion.id + "']").prop('checked', false);
    }
    else {
      addTag(suggestion.id, suggestion.name);
      $("#dependencies input[value='" + suggestion.id + "']").prop('checked', true);
    }
    $('#autocomplete').typeahead('val', '');
  });
  $("#starters").on("click", "button", function () {
    var id = $(this).parent().attr("data-id");
    $("#dependencies input[value='" + id + "']").prop('checked', false);
    removeTag(id);
  });
  $("#groupId").on("change", function () {
    $("#packageName").val($(this).val());
  });
  $("#artifactId").on("change", function () {
    $("#name").val($(this).val());
  });
  $("#dependencies input").bind("change", function () {
    var value = $(this).val();
    if ($(this).prop('checked')) {
      var results = starters.get(value);
      addTag(results[0].id, results[0].name);
    } else {
      removeTag(value);
    }
  });
  Mousetrap.bind(['command+enter', 'alt+enter'], function (e) {
    $("#form").submit();
    return false;
  });
  var autocompleteTrap = new Mousetrap($("#autocomplete").get(0));
  autocompleteTrap.bind(['command+enter', 'alt+enter'], function (e) {
    $("#form").submit();
    return false;
  });
  autocompleteTrap.bind("enter", function (e) {
    if (e.preventDefault) {
      e.preventDefault();
    } else {
      e.returnValue = false;
    }
  });

  applyParams();
  if ("onhashchange" in window) {
    window.onhashchange = function () {
      $(".full").addClass("hidden");
      $(".tofullversion").removeClass("hidden");
      $(".tosimpleversion").addClass("hidden");
      applyParams();
    }
  }
});