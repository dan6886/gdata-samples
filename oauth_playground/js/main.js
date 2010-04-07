/* Copyright (c) 2009 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Implements the UI functionality and JS utility methods
 * for the OAuth Playground. Handles initializing, updating, and resetting
 * various components in the UI. Its dependencies include the JQuery library,
 * jquery.form.js plugin, and SyntaxHighligher.
 *
 * @author e.bidelman@google.com (Eric Bidelman)
 */

// Protected namespace
var playground = {};

playground.TOKEN_ENDPOINTS = {
  'request' : 'OAuthGetRequestToken',
  'authorized' : 'OAuthAuthorizeToken',
  'access' : 'OAuthGetAccessToken',
  'info' : 'accounts/AuthSubTokenInfo',
  'revoke' : 'accounts/AuthSubRevokeToken'
};

// Displays what type of the token the user currently has
playground.TOKEN_TYPE = {
  'request' : 'request token',
  'authorized' : 'request token (authorized)',
  'access' : 'access token'
};

// Google Data API services and example feed endpoints
playground.SCOPES = {
  'Analytics' : {
      'scope' : 'https://www.google.com/analytics/feeds/',
      'feeds' : ['accounts/default']
  },
  'Google Base' : {
      'scope' : 'http://www.google.com/base/feeds/',
      'feeds' : ['snippets', 'items', 'attributes', 'itemtypes/&lt;locale&gt;']
  },
  'Book Search' : {
      'scope' : 'http://www.google.com/books/feeds/',
      'feeds' : ['volumes/[&lt;volume_ID&gt;]',
                'p/&lt;PARTNER_COBRAND_ID&gt;/volumes',
                'users/me/collections/library/volumes',
                'users/me/volumes']
  },
  'Blogger' : {
      'scope' : 'http://www.blogger.com/feeds/',
      'feeds' : ['default/blogs', '&lt;blogID&gt;/posts/default',
                '&lt;blogID&gt;/[&lt;postID&gt;]/comments/default']
  },
  'Calendar' : {
      'scope' : 'http://www.google.com/calendar/feeds/',
      'feeds' : ['default/allcalendars/full/[&lt;calendarID&gt;]',
                'default/owncalendars/full',
                'default/&lt;visibility&gt;/full/[&lt;eventID&gt;]']
  },
  'Contacts' : {
      'scope' : 'http://www.google.com/m8/feeds/',
      'feeds' : ['contacts/default/full/[&lt;contactID&gt;]',
                'groups/default/full/[&lt;contactID&gt;]']
  },
  'Documents List' : {
      'scope' : 'http://docs.google.com/feeds/',
      'feeds' : ['default/private/full/',
                'default/private/full/&lt;resource_id&gt;/acl',
                'default/private/full/&lt;folder_resouce_id&gt;/contents',
                'default/private/full/&lt;resouce_id&gt;/revisions',
                'metadata/default']
  },
  'Finance' : {
      'scope' : 'http://finance.google.com/finance/feeds/',
      'feeds' : ['default/portfolios/[&lt;portfolioID&gt;]',
                'default/portfolios/&lt;portfolioID&gt;/positions/' +
                '[&lt;tickerID&gt;]',
                'default/portfolios/&lt;portfolioID&gt;/positions/' +
                '&lt;tickerID&gt;/transactions/[&lt;transactionID&gt;]']
  },
  'GMail' : {
      'scope' : 'https://mail.google.com/mail/feed/atom',
      'feeds' : ['/[&lt;label&gt;]']
  },
  'Health' : {
      'scope' : 'https://www.google.com/health/feeds/',
      'feeds' : ['profile/default', 'register/default']
  },
  'H9' : {
      'scope' : 'https://www.google.com/h9/feeds/',
      'feeds' : ['profile/default', 'register/default']
  },
  'Maps' : {
      'scope' : 'http://maps.google.com/maps/feeds/',
      'feeds' : ['maps/default/full', 'maps/userID/full/[&lt;elementID&gt;]',
                 'features/default/[&lt;mapID&gt;]/full/[&lt;elementID&gt;]']
  },
  'Moderator' : {
      'scope' : 'tag:google.com,2010:auth/moderator',
      'feeds' : ['']
  },
  'OpenSocial' : {
      'scope' : 'http://www-opensocial.googleusercontent.com/api/people/',
      'feeds' : ['@me/@all']
  },
  'orkut' : {
      'scope' : 'http://www.orkut.com/social/rest',
      'feeds' : ['']
  },
  'Picasa Web' : {
      'scope' : 'http://picasaweb.google.com/data/',
      'feeds' : ['feed/api/user/default/[albumid/&lt;albumID&gt;]',
                'entry/api/user/default/albumid/&lt;albumID&gt;/' +
                '&lt;versionNumber&gt;',
                'entry/api/user/default/albumid/&lt;albumID&gt;/photoid/' +
                '&lt;photoID&gt;/&lt;versionNumber&gt;',
                'media/api/user/default/albumid/&lt;albumID&gt;/photoid/' +
                '&lt;photoID&gt;/&lt;versionNumber&gt;']
  },
  'Sidewiki' : {
      'scope' : 'http://www.google.com/sidewiki/feeds/',
      'feeds' : ['entries/author/&lt;authorId&gt;/full',
                 'entries/webpage/&lt;webpageUri&gt;/full']
   },
  'Sites' : {
      'scope' : 'http://sites.google.com/feeds/',
      'feeds' : ['content/&lt;site&gt;/&lt;site_name&gt;/&lt;entryID&gt;]',
                 'revision/&lt;site&gt;/&lt;site_name&gt;',
                 'activity/&lt;site&gt;/&lt;site_name&gt;/[&lt;entryID&gt;]',
                 'site/&lt;site&gt;/[&lt;entryID&gt;]',
                 'acl/site/&lt;site&gt;/&lt;site_name&gt;/[&lt;entryID&gt;]']
   },
  'Spreadsheets' : {
      'scope' : 'http://spreadsheets.google.com/feeds/',
      'feeds' : ['spreadsheets/private/full/[&lt;key&gt;]',
                 'worksheets/&lt;key&gt;/private/full/[&lt;worksheetID&gt;]',
                 'list/&lt;key&gt;/&lt;worksheetID&gt;/private/full/' +
                 '[&lt;rowID&gt;]',
                 'cells/&lt;key&gt;/&lt;worksheetID&gt;/private/full/' +
                 '[&lt;cellID&gt;]',
                 '&lt;key&gt;/tables/[&lt;tableID&gt;]',
                 '&lt;key&gt;/records/&lt;tableID&gt;/[&lt;recordID&gt;]']
  },
  'Webmaster Tools' : {
      'scope' : 'http://www.google.com/webmasters/tools/feeds/',
      'feeds' : ['sites/[&lt;siteID&gt;]', '&lt;siteID&gt;/sitemaps']
  },
  'YouTube' : {
      'scope' : 'http://gdata.youtube.com',
      'feeds' : ['/feeds/api/users/default',
                '/feeds/api/users/default/contacts',
                '/feeds/api/users/default/favorites',
                '/feeds/api/users/default/playlists/[&lt;playlistID&gt;]',
                '/feeds/api/users/default/subscriptions',
                '/feeds/api/videos/&lt;videoID&gt;/related',
                '/feeds/api/videos/&lt;videoID&gt;/responses',
                '/feeds/api/videos/&lt;videoID&gt;/comments',
                '/feeds/api/standardfeeds/[&lt;regionID&gt;]/top_rated',
                '/feeds/api/standardfeeds/[&lt;regionID&gt;]/top_favorites',
                '/feeds/api/standardfeeds/[&lt;regionID&gt;]/most_viewed',
                '/feeds/api/standardfeeds/[&lt;regionID&gt;]/most_popular',
                '/feeds/api/standardfeeds/[&lt;regionID&gt;]/most_recent',
                '/feeds/api/standardfeeds/[&lt;regionID&gt;]/most_discussed',
                '/feeds/api/standardfeeds/[&lt;regionID&gt;]/most_linked',
                '/feeds/api/standardfeeds/[&lt;regionID&gt;]/most_responded',
                '/feeds/api/standardfeeds/[&lt;regionID&gt;]/recently_featured',
                '/feeds/api/standardfeeds/watch_on_mobile']
  }
};

//playground.DATA_VIEW_WIDTH = null; // original width of right panel
playground.currentScope = {};      // current selected scope(s)
playground.COOKIE_EXPIRE = 10;     // num days for cookies to expire

// Setup event handlers and initialize UI
jQuery(document).ready(function() {

  // Build scope options (Step 1)
  playground.buildScopeOptions();

  // Set initial width on output panels
  DATA_VIEW_WIDTH = jQuery('#http_response').width();
  jQuery('.dataView').width(DATA_VIEW_WIDTH);

  // CSS handler for pretty buttons
  jQuery('.button').hover(
    function() {
      jQuery(this).addClass('button-hover');
    },
    function() {
      jQuery(this).removeClass('button-hover');
    }
  );

  // Bind oauth_form as an 'ajaxForm'
  jQuery('#oauth_form').ajaxForm({
    url : 'index.php', // overrides form's action
    beforeSubmit : playground.showRequest, // pre-submit callback
    success : playground.showResponse, // post-submit callback
    dataType : 'json' // type of reponse to expect
  });

  // ===========================================================================
  // GET THE TOKEN (step 3-5) buttons
  // ===========================================================================

  // --------------------- 'Token management' links ----------------------------
  // 'get token info' link
  jQuery('#get_token_link').click(function() {
    jQuery('#http_method').val('GET');
    var hostPrefix = jQuery('#host').val();
    jQuery('#feedUri').val(hostPrefix + '/' + playground.TOKEN_ENDPOINTS['info']);
    return false;
  });

  // 'revoke token' link
  jQuery('#revoke_token_link').click(function() {
    jQuery('#http_method').val('GET');
    var hostPrefix = jQuery('#host').val();
    jQuery('#feedUri').val(hostPrefix + '/' + playground.TOKEN_ENDPOINTS['revoke']);
    return false;
  });

  // 'start over' link
  jQuery('#start_over_link').click(function() {
    jQuery('#http_method').val('GET');
    jQuery('#tokenType').html('');
    jQuery('#oauth_token').val('');
    jQuery('#token_ops').hide();
    jQuery('#token_secret').val('');
    playground.setCookie('token_secret', '', playground.COOKIE_EXPIRE);
    jQuery('#request_token_button').removeAttr('disabled');
    return false;
  });

  // -------------------- Fetch oauth token buttons ----------------------------
  jQuery('#request_token_button').click(function() {
    playground.setCookie('tokenType', 'request', playground.COOKIE_EXPIRE);
    var hostPrefix = jQuery('#host').val();
    jQuery('#token_endpoint').val(hostPrefix + '/' +
                                  playground.TOKEN_ENDPOINTS['request']);
    playground.setCookie('host', hostPrefix, playground.COOKIE_EXPIRE);
    jQuery(this).val('request_token');
  });

  jQuery('#authorize_token_button').click(function() {
    playground.setCookie('tokenType', 'authorized', playground.COOKIE_EXPIRE);
    jQuery('#token_endpoint').val(jQuery('#host').val() + '/' +
                                  playground.TOKEN_ENDPOINTS['authorized']);
    jQuery(this).val('authorize');
  });

  jQuery('#access_token_button').click(function() {
    playground.setCookie('tokenType', 'access', playground.COOKIE_EXPIRE);
    jQuery('#token_endpoint').val(jQuery('#host').val() + '/' +
                                  playground.TOKEN_ENDPOINTS['access']);
    jQuery(this).val('access_token');
  });

  jQuery('#advanced_check').click(function() {
    //jQuery('#endpoint_container').toggle();
    jQuery('#xoauth_displayname_container').toggle();
    if (!this.checked) {
      playground.setCookie('customEndpoint', 'no', playground.COOKIE_EXPIRE);
    } else {
      playground.setCookie('customEndpoint', 'yes', playground.COOKIE_EXPIRE);
    }
  });
  // ===========================================================================


  // ===========================================================================
  // EXECUTE SECTION (Step 6)
  // ===========================================================================

  // HTTP method dropdown <SELECT>
  jQuery('#sig_method').change(playground.setTokenUI);

  // 'Execute' button
  jQuery('#execute').click(function() {
    if (!jQuery('#feedUri').val()) {
      alert('Please enter a feed');
      return false;
    }
    return true;
  });

  // Toggle syntax highlighter checkbox
  jQuery('#syntaxHighlight').click(function() {
    playground.setCookie('syntaxHighlight', 'no', playground.COOKIE_EXPIRE);
    if (!this.checked) {
      playground.setCookie('syntaxHighlight', 'no', playground.COOKIE_EXPIRE);
    } else {
      playground.setCookie('syntaxHighlight', 'yes', playground.COOKIE_EXPIRE);
    }
  });
  // ===========================================================================


  // Decide what type of token we have and display that on page load
  if (jQuery('#oauth_token').val() == '') {
    playground.setCookie('tokenType', '', playground.COOKIE_EXPIRE);
    playground.setCookie('host', 'www.google.com', playground.COOKIE_EXPIRE);
    jQuery('#tokenType').html('');
    jQuery('#token_ops').hide();
    jQuery('#request_token_button').removeAttr('disabled');
  } else {
    var tokenType = playground.getCookie('tokenType');

    // User has authorized request token or access token
    if (tokenType != null && tokenType != '') {
      jQuery('#tokenType').html(playground.TOKEN_TYPE[tokenType]);
      jQuery('#host').val(playground.getCookie('host'));
      jQuery('#token_secret').val(playground.getCookie('token_secret'));

      // Enable appropriate UI elements based on type of token
      switch(tokenType) {
        case 'authorized':
          jQuery('#access_token_button').removeAttr('disabled');
          break;
        case 'access':
          jQuery('#feedUri').focus();
          jQuery('#token_ops').show();
          break;
      }
    }
  }

  // Restore user's advanced? settings checkbox pref
  if (playground.getCookie('customEndpoint') == 'yes') {
    jQuery('#endpoint_container').show();
    jQuery('#advanced_check').get(0).checked = true;
    jQuery('#xoauth_displayname_container').show();
  }

  // Restore user's syntax highlight checkbox pref
  if (playground.getCookie('syntaxHighlight') == 'no') {
    jQuery('#syntaxHighlight').get(0).checked = false;
  }

  // Restore user's oauth signature method pref
  var sig_method = playground.getCookie('sig_method');
  if (sig_method) {
    jQuery('#sig_method').val(sig_method);
    playground.setTokenUI();
  }

});


// ===========================================================================
// MODIFY THE OAUTH PARAMETERS section (Step 2) - UI initializer
// ===========================================================================
playground.setTokenUI = function() {
  var sign_method = jQuery('#sig_method').val();
  if (sign_method == 'HMAC-SHA1') {
    jQuery('#consumer_secret_container').slideDown();
    jQuery('p#ownPrivKey a').hide();
  } else {
    jQuery('#consumer_secret_container').slideUp('fast');
    jQuery('p#ownPrivKey a').show();
  }
  playground.setCookie('sig_method', sign_method, playground.COOKIE_EXPIRE);
};

/**
 * Presubmit callback for the ajax form that initializes display data panels.
 * @return {boolean} Alway return true to submit ajax form
 */
playground.showRequest = function(data) {
  jQuery('.nogutter').remove();
  jQuery('#base_string').html('');
  jQuery('#http_request').html('');
  jQuery('#http_response').html('<div class="loading">' +
      '<img src="images/ajax-loader.gif"><br>loading</div>').show();

  return true;  // return true to submit form
};

/**
 * Postsubmit callback for the ajax form that displays response data.
 * @param {json object} responseText The response data as a json object.
 *     The jquery-form plugin automatically fills this variable name
 */
playground.showResponse = function(responseText) {
  var json = responseText;
  var response = json.response || '';
  var baseString = json.base_string || '';
  var authorizationHeader = json.authorization_header || '';
  var html_link = json.html_link + '&v=' + jQuery('#gdata-version').val() || '';
  var response_headers = json.headers || '';

  var callback = json.callback || '';
  var args = json.args || '';
  var syntaxHighlight = jQuery('#syntaxHighlight').get(0).checked;
  if (callback && args) {
    response = window['playground'][callback](args);
    if (!syntaxHighlight) {
      response = response.replace(/(https?:\/\/.*)/g, '<a href="$1" onclick="javascript:jQuery(\'#feedUri\').val(\'$1\');return false;">$1</a>');
    }
    jQuery('#http_method').val('GET');
  }

  jQuery('#http_request').html(authorizationHeader);
  jQuery('#base_string').html(baseString);

  if (jQuery('#http_method').val() == 'GET') {
    jQuery('#html_link').html(
        '<a href="' + html_link + '" target="_blank">view in browser</a>');
  } else {
     jQuery('#html_link').html('');
  }

  // extract oauth_token and oauth_token_secret values from request token step
  var matches = response.match(/oauth_token=(.*)&oauth_token_secret=(.*)&oauth_callback_confirmed=(.*)/);
  if (matches) {
    jQuery('#oauth_token').val(decodeURIComponent(matches[1]));
    jQuery('#token_secret').val(matches[2]);
    playground.setCookie('token_secret', decodeURIComponent(matches[2]),
                         playground.COOKIE_EXPIRE);
  } else {
    // extract oauth_token and secret values for access token step
    var matches = response.match(/oauth_token=(.*)&oauth_token_secret=(.*)/);
    if (matches) {
      jQuery('#oauth_token').val(decodeURIComponent(matches[1]));
      jQuery('#token_secret').val(matches[2]);
      playground.setCookie('token_secret', decodeURIComponent(matches[2]),
                           playground.COOKIE_EXPIRE);
    }
  }

  // extract oauth_timestamp value
  var matches = authorizationHeader.match(/oauth_timestamp="(.*?)"/);
  if (matches) {
    jQuery('#timestamp').val(matches[1]);
  }

  // extract oauth_nonce value
  var matches = authorizationHeader.match(/oauth_nonce="(.*?)"/);
  if (matches) {
    jQuery('#nonce').val(matches[1]);
  }

  // display what kind of oauth token we have
  var tokenType = playground.getCookie('tokenType');
  if ((tokenType != null) && (tokenType != '') &&
      (jQuery('#oauth_token').val() != '')) {
    jQuery('#tokenType').html(playground.TOKEN_TYPE[tokenType]);

    switch(tokenType) {
      case 'request':
        jQuery('#request_token_button').attr('disabled', 'disabled');
        jQuery('#authorize_token_button').removeAttr('disabled');
        break;
      case 'access':
        jQuery('#request_token_button').attr('disabled', 'disabled');
        jQuery('#authorize_token_button').attr('disabled', 'disabled');
        jQuery('#access_token_button').attr('disabled', 'disabled');
        jQuery('#token_ops').show();
        break;
      default:
        jQuery('#token_ops').hide();
    }
  } else if (jQuery('#oauth_token').val() == '') {
    jQuery('#tokenType').html('');
    jQuery('#token_ops').hide();
  }

  // syntax highlight? and resize correct response panel
  if (syntaxHighlight) {
    jQuery('#http_response').html(response_headers + response);
    dp.SyntaxHighlighter.ClipboardSwf = 'js/flash/clipboard.swf';
    dp.SyntaxHighlighter.HighlightAll('code');
    jQuery('.nogutter').css('width', DATA_VIEW_WIDTH + 10);
  } else {
    response = response.replace(/(https?:\/\/[^schemas].*?)&quot;/g, '<a href="$1" onclick="javascript:jQuery(\'#feedUri\').val(\'$1\');return false;">$1</a>"');
    jQuery('#http_response').html(response_headers + response);
    jQuery('#http_response').css('width', DATA_VIEW_WIDTH);
  }
};

/**
 * Processes results from click of discover 'available feeds' button
 * @param {string} scopeArr An array formatted as a string that contains
 *     the scopes the OAuth token is valid for.
 * @return {string} A formatted string containg the available Google Data feeds.
 */
playground.getAvailableFeeds = function(scopeArr) {
  var feeds = [];

  var scopes = eval(scopeArr);
  for (var i = 0, scope; scope = scopes[i]; i++) {
    for (var service in playground.SCOPES) {
      if (playground.SCOPES[service].scope == scope) {
        feeds.push("\n" + service);
        jQuery.each(playground.SCOPES[service].feeds, function() {
          feeds.push(scope + this);
        });
      }
    }
  }

  // <pre> tags necessary for IE
  return '<pre>' + feeds.join("\n") + '</pre>';
};

// Utility functions -----------------------------------------------------------
/**
 * Build and display the list of possible Google Data scopes.
 */
playground.buildScopeOptions = function() {
  var scopes = playground.SCOPES;
  var html = ['<ul class="scopes">'];

  for (var service in scopes) {
    var scope = scopes[service].scope;
    html.push('<li><div><img src="images/unchecked.gif" ' +
              'onclick="playground.swapCheck(this, \'' + scope +
              '\')" align="top"/><input type="checkbox" id="' + scope +
              '" value="' + scope + '" style="display:none">' + service +
              '</div><span>' + scope + '</span></li>');
  }
  html.push('</ul>');

  jQuery('#scopes_container').html(html.join(''));

  // register click handlers
  jQuery('.scopes img').click(function() {
    var checkbox = jQuery(this).next();
    var key = checkbox.parent().text();
    if (checkbox.get(0).checked) {
      playground.currentScope[key] = checkbox.val();
    } else {
      delete playground.currentScope[key];
    }

    var temp = [];
    for (var i in playground.currentScope) {
      temp.push(playground.currentScope[i]);
    }

    jQuery('#scope').val(temp.join(' '));
  });
};

/**
 * Sets a browser cookie by name/value
 * @param {string} name The name of the cookie to set
 * @param {string} value A value to set the cookie to
 * @param {number} expiredays The number of days the cookie should live
 */
playground.setCookie = function(name, value, expiredays) {
  var exdate = new Date();
  exdate.setDate(exdate.getDate() + expiredays);
  document.cookie = name + '=' + escape(value) +
      ((expiredays == null) ? '' : ';expires=' + exdate.toGMTString());
};

/**
 * Retrieves a browser cookie's value by name.
 * @param {string} name The name of the cookie to get
 * @return {string} The value of the cookie, otherwise an empty string
 */
playground.getCookie = function(name) {
  if (document.cookie.length > 0) {
    var c_start = document.cookie.indexOf(name + '=');
    if (c_start != -1) {
      c_start += name.length + 1;
      var c_end = document.cookie.indexOf(';', c_start);
      if (c_end == -1) {
        c_end = document.cookie.length;
      }
      return unescape(document.cookie.substring(c_start, c_end));
    }
  }
  return '';
};

/**
 * Simulates a checkbox toggle with an image as a replacement.
 * @param {HTMLElement} image An HTML <img> element
 * @param {string} id A DOM id of an HTML checkbox
 */
playground.swapCheck = function(image, id) {
  var checkbox = document.getElementById(id);
  checkbox.checked = !checkbox.checked;
  image.src = (checkbox.checked) ? 'images/check.gif' : 'images/unchecked.gif';
};
