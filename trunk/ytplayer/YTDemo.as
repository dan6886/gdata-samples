class YTDemo {
  
  // create a MovieClip to load the player into
  var ytplayer:MovieClip = _root.createEmptyMovieClip("ytplayer", 1);

  // create a listener object for the MovieClipLoader to use
  var ytPlayerLoaderListener:Object = {
    onLoadInit: function() { 
      // When the player clip first loads, we start an interval to check for when the
      // player is ready
      this.loadInterval = setInterval(this.checkPlayerLoaded, 250);
    }
  };
  
  var loadInterval:Number;


  function checkPlayerLoaded():Void {
      // once the player is ready, we can subscribe to events, or in the case of
      // the chromeless player, we could load videos
      if (ytplayer.isPlayerLoaded()) {
          ytplayer.addEventListener("onStateChange", onPlayerStateChange);
          ytplayer.addEventListener("onError", onPlayerError);
          clearInterval(loadInterval);
      }
  }

  function onPlayerStateChange(newState:Number) {
      trace("New player state: "+ newState);
  }

  function onPlayerError(errorCode:Number) {
      trace("An error occurred: "+ errorCode);
  }


  static var app : YTDemo;

  function YTDemo() {
    
    // create a MovieClipLoader to handle the loading of the player
    var ytPlayerLoader:MovieClipLoader = new MovieClipLoader();
    ytPlayerLoader.addListener(ytPlayerLoaderListener);

    // load the player
    ytPlayerLoader.loadClip("http://www.youtube.com/v/_UNgokP71tw", ytplayer);
  }

  // entry point
  static function main(mc) {
	  app = new YTDemo();
  }
}
