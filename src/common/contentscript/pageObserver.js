var PAGE_OBSERVER_PARAMETERS = {
    attributes: false,
    characterData: true,
    childList: true,
    subtree: true
};
var TREE_WALKER_FILTER = {
    acceptNode: treeWalkerFilterFunction
};
var ILLEGAL_TAGNAMES = [
    'IMG', 'NOSCRIPT', 'SCRIPT', 'STYLE', 'TEXTAREA'
];
var currentlyInvestigating = false;
var mutatedNodes = [];
var mutationObserver;
var nodeCallback;
var onNewWindow;


function startMutationObserver(callback) {
    mutationObserver = new MutationObserver(onPageChange);
    nodeCallback = callback;

    observeWindow(window);
}

function setNewWindowCallback(callback) {
    onNewWindow = callback;
}

function observeIFrame(iframe) {
    // Need a short delay for dynamically inserted iframes to be observed properly
    setTimeout(function() {
        observeWindow(this.contentWindow);
    }.bind(iframe), 1000);
}

function observeWindow(w) {
    try {
        var doc = w.document;

        if (doc.readyState === 'complete') {
            attachMutationObserver.call(doc);
        } else {
            doc.addEventListener('load', attachMutationObserver);
        }
    } catch (domException) {
        console.log(domException);
    }
}

function attachMutationObserver() {
    mutationObserver.observe(this.body, PAGE_OBSERVER_PARAMETERS);
    mutatedNodes.push(this.body);

    if (onNewWindow) {
        onNewWindow(this.body);
    }

    iterateThroughPendingNodes();
}

function onPageChange(changes) {
    for (var i = 0; i < changes.length; ++i) {
        var pageChange = changes[i];

        if (pageChange.type === 'characterData') {
            addMutatedNode(pageChange.target);
        } else if (pageChange.type === 'childList') {
            for (var index = 0; index < pageChange.addedNodes.length; ++index) {
                var nextNode = pageChange.addedNodes.item(index);

                if (nextNode.tagName === 'IFRAME') {
                    observeIFrame(nextNode);
                } else {
                    addMutatedNode(nextNode);
                }
            }
        }
    }

    iterateThroughPendingNodes();
}

function addMutatedNode(node) {
    if (isIllegalNode(node) === false) {
        mutatedNodes.push(node);
    }
}

function iterateThroughPendingNodes() {
    if (currentlyInvestigating === false) {
        currentlyInvestigating = true;

        while (mutatedNodes.length > 0) {
            var nextNode = mutatedNodes.pop();

            console.log(nextNode);

            if (nextNode.nodeType === Node.TEXT_NODE) {
                nodeCallback(nextNode);
            } else if (nextNode.nodeType === Node.ELEMENT_NODE) {
                if (nextNode.tagName === 'IFRAME') {
                    observeIFrame(nextNode);
                } else {
                    var children = runTreeWalker(nextNode);

                    mutatedNodes = children.concat(mutatedNodes);
                }
            }
        }

        currentlyInvestigating = false;
    }
}

function runTreeWalker(node) {
    var treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT + NodeFilter.SHOW_ELEMENT, TREE_WALKER_FILTER, false);
    var treeChild;
    var results = [];

    while ((treeChild = treeWalker.nextNode())) {
        if (isIllegalNode(treeChild) === false) {
            results.push(treeChild);
        }
    }

    return results;
}

function treeWalkerFilterFunction(node) {
    var filter = NodeFilter.FILTER_SKIP;

    if (node.nodeType === Node.TEXT_NODE) {
        filter = NodeFilter.FILTER_ACCEPT;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'IFRAME') {
            filter = NodeFilter.FILTER_ACCEPT;
        }
    }

    return filter;
}

function isIllegalNode(node) {
    var isIllegal = true;

    if (node && (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE)) {
        var elementNode = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;

        isIllegal = false;

        if (node.nodeType === Node.TEXT_NODE && !elementNode) {
            isIllegal = true;
        } else if (ILLEGAL_TAGNAMES.indexOf(elementNode.tagName) !== -1) {
            isIllegal = true;
        } else if (elementNode.classList.contains('GTETipsy') === true) {
            isIllegal = true;
        } else if (elementNode.isContentEditable) {
            isIllegal = true;
        } else if (node.textContent.replace(/\s/g, '').length < 2) {
            isIllegal = true;
        } else if (node.isGTENode) {
            isIllegal = true;
        }
    }

    return isIllegal;
}

module.exports = {
    observe: startMutationObserver,
    onNewWindow: setNewWindowCallback
};