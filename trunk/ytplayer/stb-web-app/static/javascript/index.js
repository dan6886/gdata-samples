(function() {
  // CONSTANTS
  var OAUTH2_CLIENT_ID = '173796766746.apps.googleusercontent.com';
  var OAUTH2_CLIENT_SECRET = 'zpHfKjGxcjc38Sxn1xbUGZF_';
  var OAUTH2_SCOPE = 'https://gdata.youtube.com';
  var OAUTH2_GRANT_TYPE = 'http://oauth.net/grant_type/device/1.0';
  var OAUTH2_REFRESH_GRANT_TYPE = 'refresh_token';
  var DEVELOPER_KEY = 'AI39si4dX_0lqsLLDPe7rbkuRUymNjyFfq97e0N0JSPfiS4ehFfUMXTBB4iKZP2X3i6paUyRuZt42-OIAfcsNh9EoHqQ--oqOw';
  // TODO: This needs to be updated to the production URL once CORS support is rolled out.
  var URL_PREFIX = 'https://dev.gdata.youtube.com/feeds/api/';
  var MAX_RESULTS = 50;
  var QUERY_PARAMS = 'v=2&format=5&alt=json&fields=entry(title,media:group(media:thumbnail[@yt:name="hqdefault"](@url),yt:videoid))&max-results=' + MAX_RESULTS + '&key=' + DEVELOPER_KEY;
  var IDLE_TIMEOUT_MILLISECONDS = 5 * 1000;
  var PROGRESS_BAR_INTERVAL_MILLISECONDS = 1 * 1000;
  var REWIND_INTERVAL_SECONDS = -10;
  var FAST_FORWARD_INTERVAL_SECONDS = 10;
  var INCREMENT_VOLUME = 10;
  var DECREMENT_VOLUME = 0 - INCREMENT_VOLUME;
  var MIN_VOLUME = 0;
  var MAX_VOLUME = 100;
  
  var player;
  var queue;
  var progressBarInterval;

  // Called automatically when the YouTube iframe API is available.
  window.onYouTubePlayerAPIReady = function() {
    player = new YT.Player('player', {
      playerVars: {
        controls: 0,
        showinfo: 0,
        html5: 1,
        rel: 0
      },
      events: {
        onReady: function(event) {
          $(document).keydown(function(event) {
            switch (event.keyCode) {
              case 39: // Right arrow
              case 176: // Media skip
                playNextVideo();
                break;

              case 32: // Space
              case 179: // Play/pause
                togglePlayPaused();
                break;

              case 178: // Stop
                player.pauseVideo();
                break;

              case 37: // Left arrow
              case 227: // Rewind
                skip(REWIND_INTERVAL_SECONDS);
                break;

              case 38: // Up arrow
                changeVolume(INCREMENT_VOLUME);
                break;

              case 40: // Down arrow
                changeVolume(DECREMENT_VOLUME);
                break;

              case 228: // Fast-forward
                skip(FAST_FORWARD_INTERVAL_SECONDS);
                break;
            }
          });

          $('.needs-player').attr('disabled', false);

          updateProgressBar();

          var initialFeed = $('#feed-tabs').find('li:first').find('a').data('feed');
          loadFeed(initialFeed);
        },

        onStateChange: function(event) {
          switch (event.data) {
            case YT.PlayerState.PLAYING:
              $('#video-title').show();

              if (progressBarInterval == null) {
                progressBarInterval = setInterval(updateProgressBar, PROGRESS_BAR_INTERVAL_MILLISECONDS);
              }
            break;

            case YT.PlayerState.ENDED:
              playNextVideo();
            break;

            default:
              if (progressBarInterval != null) {
                clearInterval(progressBarInterval);
                progressBarInterval = null;
              }
          }
        },

        onPlaybackQualityChange: function(event) {
        },

        onError: function(event) {
          if (typeof console !== 'undefined') {
            console.log(event);
          }

          playNextVideo();
        }
      }
    });
  }

  function playNextVideo() {
    if (player && queue && queue.length > 0) {
      var video = queue.shift();
      $('#video-title').hide().html(video.title);
      player.loadVideoById(video.videoid);
      $('#thumbnail-' + video.videoid).fadeOut('slow');
    }
  }

  function togglePlayPaused() {
    if (player) {
      switch (player.getPlayerState()) {
        case YT.PlayerState.ENDED:
        case YT.PlayerState.PAUSED:
        case YT.PlayerState.CUED:
          player.playVideo();
          break;

        case YT.PlayerState.PLAYING:
        case YT.PlayerState.BUFFERING:
          player.pauseVideo();
          break;
      }
    }
  }

  function skip(interval) {
    if (player) {
      var currentTime = player.getCurrentTime();
      var newTime = currentTime + interval;
      if (newTime > player.getDuration()) {
        playNextVideo();
      } else {
        if (newTime < 0) {
          newTime = 0;
        }
        player.seekTo(newTime, true);
      }

      updateProgressBar();
    }
  }

  function changeVolume(delta) {
    if (player) {
      var newVolume = player.getVolume() + delta;

      if (newVolume < MIN_VOLUME) {
        newVolume = MIN_VOLUME;
      } else if (newVolume > MAX_VOLUME) {
        newVolume = MAX_VOLUME;
      }

      player.setVolume(newVolume);
    }
  }

  function updateProgressBar() {
    var currentProgress = 0;

    if (player) {
      currentProgress = 100 * player.getCurrentTime() / player.getDuration();
      if (isNaN(currentProgress)) {
        currentProgress = 0;
      }
    }

    $('#progress-bar').progressbar({ value: currentProgress });
  }

  function loadFeed(feedPath, dontRefreshAuthentication) {
    var querySeparator = '&';
    if (feedPath.indexOf('?') == -1) {
      querySeparator = '?';
    }

    var authParam = '';
    if (localStorage.getItem('access_token') != null) {
      authParam = '&access_token=' + localStorage.getItem('access_token');
    }

    $.ajax({
      dataType: 'json',
      url: URL_PREFIX + feedPath + querySeparator + QUERY_PARAMS + authParam,
      success: function(response) {
        if (response.feed && response.feed.entry) {
          var thumbnailsDivs = [];
          queue = [];

          $.each(response.feed.entry, function(index, entry) {
            var title = entry['title']['$t'];
            var thumbnailUrl = entry['media$group']['media$thumbnail'][0]['url'];
            var videoId = entry['media$group']['yt$videoid']['$t'];

            queue.push({
              title: title,
              thumbnail: thumbnailUrl,
              videoid: videoId
            });

            thumbnailsDivs.push($.sprintf('<div class="thumbnail-container" id="thumbnail-%s"><img class="thumbnail-image" src="%s" title="%s"></div>', videoId, thumbnailUrl, title));
          });

          $('#thumbnails').html(thumbnailsDivs.join(''));
        }

        playNextVideo();
      },
      statusCode: {
        401: function() {
          if (!dontRefreshAuthentication) {
            refreshAuthentication(feedPath);
          } else {
            logOut();
          }
        }
      }
    });
  }

  function pollForAuth(code, lastPollTime, nextPollDelay) {
    if (new Date().getTime() < lastPollTime) {
      $.ajax({
        dataType: 'json',
        url: '/proxy',
        data: {
          path: '/o/oauth2/token',
          client_id: OAUTH2_CLIENT_ID,
          client_secret: OAUTH2_CLIENT_SECRET,
          code: code,
          grant_type: OAUTH2_GRANT_TYPE
        },
        type: 'POST',
        success: function(response) {
          if (response.error) {
            if (response.error == 'slow_down') {
              nextPollDelay += 5;
            }

            setTimeout(function() {
              pollForAuth(code, lastPollTime, nextPollDelay);
            }, nextPollDelay * 1000);
          } else {
            $('#login-dialog').dialog('close');

            localStorage.setItem('refresh_token', response.refresh_token);
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('token_type', response.token_type);

            $('#log-in-or-out').button({ label: 'Log Out' });
            $('.needs-auth').show();
          }
        }
      });
    }
  }

  function refreshAuthentication(feedPath) {
    $.ajax({
      dataType: 'json',
      url: '/proxy',
      data: {
        path: '/o/oauth2/token',
        client_id: OAUTH2_CLIENT_ID,
        client_secret: OAUTH2_CLIENT_SECRET,
        refresh_token: localStorage.getItem('refresh_token'),
        grant_type: OAUTH2_REFRESH_GRANT_TYPE
      },
      type: 'POST',
      success: function(response) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('token_type', response.token_type);

        if (feedPath) {
          loadFeed(feedPath, true);
        }
      },
      error: function() {
        logOut();
      }
    });
  }

  function logIn() {
    $.ajax({
      dataType: 'json',
      url: '/proxy',
      data: {
        path: '/o/oauth2/device/code',
        client_id: OAUTH2_CLIENT_ID,
        scope: OAUTH2_SCOPE
      },
      type: 'POST',
      success: function(response) {
        var loginInstructions = $.sprintf('From any computer, please visit <a href="%s" target="_blank">%s</a> and enter code <strong>%s</strong>', response.verification_url, response.verification_url, response.user_code);
        $('#login-dialog').dialog({
          modal: true,
          draggable: false,
          width: '85%',
          title: 'Login Instructions'
        }).html(loginInstructions);
        pollForAuth(response.device_code, new Date().getTime() + response.expires_in * 1000, response.interval);
      }
    });
  }

  function logOut() {
    localStorage.clear();
    $('.needs-auth').hide();
    $('#log-in-or-out').button({ label: 'Log In' });
  }

  // On load.
  $(function() {
    $('button').button();
    
    // Load the Player API. window.onYouTubePlayerAPIReady will be invoked when it's loaded.
    $.getScript('//www.youtube.com/player_api');

    $('.needs-player').attr('disabled', true);

    if (localStorage.getItem('token_type') == null || localStorage.getItem('access_token') == null) {
      $('.needs-auth').hide();
      $('#log-in-or-out').button({ label: 'Log In' });
    } else {
      $('#log-in-or-out').button({ label: 'Log Out' });
    }

    $('#log-in-or-out').click(function() {
      if (localStorage.getItem('token_type') == null || localStorage.getItem('access_token') == null) {
        logIn();
      } else {
        logOut();
      }
    });

    $('#feed-tabs').tabs();
    $('#feed-tabs').bind('tabsselect', function(event, ui) {
      loadFeed($(ui.tab).data('feed'));
    });

    $.idleTimer(IDLE_TIMEOUT_MILLISECONDS);
    $(document).bind('idle.idleTimer', function() {
      $('.fades-when-idle').fadeOut('slow', function() {
        $('#video-container').get(0).className = 'video-container-fullscreen';
      });
    });
    $(document).bind('active.idleTimer', function() {
      $('.fades-when-idle').fadeIn('fast', function() {
        $('#video-container').get(0).className = 'video-container-minimized';
      });
    });
  });
})();