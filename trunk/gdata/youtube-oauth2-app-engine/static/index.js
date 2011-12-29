(function() {
  var player;
  var cuedVideo;
  
  function playVideo(videoId) {
    if (player == null) {
      cuedVideo = videoId;
      $.getScript('http://www.youtube.com/player_api');
    } else {
      player.loadVideoById(videoId);
    }
  }

  // Called by the iframe player API when it's finished loading.
  // This needs to be in the window's context so that the external JS file
  // can call it.
  window.onYouTubePlayerAPIReady = function() {
    player = new YT.Player('player', {
      videoId: cuedVideo,
      events: {
        onReady: function() { player.playVideo(); }
      }
    });
  };

  // On load.
  $(function() {
    $('.video-container').click(function() {
      var videoId = $(this).data('video-id');
      playVideo(videoId);
    });
  });
})();