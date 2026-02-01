$(document).ready(function() {

  /*
   * Events registration
   */
  $("#input").keyup(function () {
    hasher.update();
  });
  $("#input").change(function () {
    hasher.update();
  });

  // Open separate window (pop-out) — click on wrapper or icon
  $("#button-popout-wrap, #button-popout").click(function (e) {
    e.preventDefault();
    if (typeof chrome.runtime !== "undefined" && chrome.runtime.getURL) {
      chrome.tabs.create({
        url: chrome.runtime.getURL("popup.html")
      });
    }
  });

  // Single handler for all tab buttons (primary tabs + dropdown items)
  function switchTab(tabId) {
    var tabValue = tabs[tabId];
    if (tabValue == null) return;

    // Remove active state from all tab buttons and from More trigger
    $(".tab-btn").removeClass("on");
    $("#more-tabs-btn").removeClass("on").attr("aria-expanded", "false");

    // If this tab is in the dropdown, highlight the dropdown trigger and the menu item
    var moreTabIds = ["hmac", "crc", "cipher", "net", "number"];
    if (moreTabIds.indexOf(tabId) !== -1) {
      $("#more-tabs-btn").addClass("on");
      $("#" + tabId).addClass("on");
      $("#more-tabs-menu").removeClass("open");
    } else {
      $("#" + tabId).addClass("on");
    }

    // show/hide password for HMAC / Cipher
    if (tabValue === tabs.hmac || tabValue === tabs.cipher) {
      $("#input-password-wrapper").show();
    } else {
      $("#input-password-wrapper").hide();
    }

    hasher.tab = tabValue;
    hasher.init();
    hasher.update();
    $("#input-value").focus();
  }

  $(document).on("click", ".tab-btn", function () {
    switchTab(this.id);
  });

  // More dropdown: toggle menu
  $("#more-tabs-btn").click(function (e) {
    e.stopPropagation();
    var menu = $("#more-tabs-menu");
    var isOpen = menu.hasClass("open");
    menu.toggleClass("open");
    $(this).attr("aria-expanded", !isOpen);
  });

  // Close dropdown when clicking outside
  $(document).on("click", function () {
    $("#more-tabs-menu").removeClass("open");
    $("#more-tabs-btn").attr("aria-expanded", "false");
  });
  $("#more-tabs-menu, #more-tabs-btn").on("click", function (e) {
    e.stopPropagation();
  });
  
  /*
   * Hash navigation
   */
  onHashChange = function () {
    var hash = window.location.hash.slice(1)
    $(".screens").hide();
    if (hash == "info") {
      $("#screen-2").show().scrollTop();
    } else {
      $("#screen-1").show().scrollTop();
    }
  }
  $(window).bind('hashchange', onHashChange);  

  /*
   * Init
   */
  onHashChange();
  hasher.init();
  hasher.update();
  
  // Focus hack, see http://stackoverflow.com/a/11400653/1295557
  if (location.search != "?focusHack") location.search = "?focusHack";
  //$("#input-value").focus();
  window.scrollTo(0, 0);
});