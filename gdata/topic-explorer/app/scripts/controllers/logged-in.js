/*
  Copyright 2012 Google Inc. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

'use strict';

topicExplorerApp.controller('LoggedInCtrl', ['$scope', '$rootScope', '$http', 'constants', 'youtube', function($scope, $rootScope, $http, constants, youtube) {
  $scope.thumbnailUrl = constants.DEFAULT_PROFILE_THUMBNAIL;

  youtube({
    method: 'GET',
    service: 'channels',
    params: {
      mine: true,
      part: 'id,snippet,contentDetails'
    },
    callback: function(response) {
      $scope.$apply(function() {
        if ('items' in response) {
          var channel = response.items[0];

          $scope.title = (channel.snippet.title.split(/\W/))[0] || constants.DEFAULT_DISPLAY_NAME;
          $scope.thumbnailUrl = channel.snippet.thumbnails.default.url;

          $rootScope.channelId = channel.id;
          $rootScope.relatedPlaylists = channel.contentDetails.relatedPlaylists;

          $scope.videoIds = [];
          $scope.personalizedTopics = [];

          getPersonalizedVideoIds([$rootScope.relatedPlaylists.watchLater,
            $rootScope.relatedPlaylists.favorites,
            $rootScope.relatedPlaylists.likes]);
        } else {
          $scope.title = constants.DEFAULT_DISPLAY_NAME;
        }
      });
    }
  });

  function getPersonalizedVideoIds(listIds) {
    if (!Array.isArray(listIds)) {
      listIds = [listIds];
    }
    var listId = listIds.pop();

    youtube({
      method: 'GET',
      service: 'playlistItems',
      params: {
        part: 'contentDetails',
        playlistId: listId,
        maxResults: constants.YOUTUBE_API_MAX_RESULTS
      },
      callback: function(response) {
        if ('items' in response) {
          angular.forEach(response.items, function(playlistItem) {
            $scope.videoIds.push(playlistItem.contentDetails.videoId);
          });
        }

        if (listIds.length > 0) {
          getPersonalizedVideoIds(listIds);
        } else {
          getTopicsForVideoIds();
        }
      }
    });
  }

  function getTopicsForVideoIds() {
    var videoIds = $scope.videoIds.slice(0, 50);

    youtube({
      method: 'GET',
      service: 'videos',
      params: {
        part: 'topicDetails',
        id: videoIds.join(',')
      },
      callback: function(response) {
        if ('items' in response) {
          var mids = {};

          angular.forEach(response.items, function(video) {
            if ('topicDetails' in video) {
              angular.forEach(video.topicDetails.topicIds, function(topicId) {
                if (!(topicId in mids)) {
                  mids[topicId] = 0;
                }
                mids[topicId]++;
              });
            }
          });

          var midScores = [];
          angular.forEach(mids, function(score, mid) {
            midScores.push({
              mid: mid,
              score: score
            });
          });

          translateMidsToTopicNames(midScores.slice(0, constants.FREEBASE_API_MAX_RESULTS));
        }
      }
    });
  }

  function translateMidsToTopicNames(midScores) {
    var midScore = midScores.pop();

    if (midScore) {
      var data = lscache.get(midScore.mid);
      if (data) {
        processFreebaseResults(data, midScore.score);

        if (midScores.length > 0) {
          translateMidsToTopicNames(midScores);
        } else {
          displayPersonalizedTopics();
        }
      } else {
        var request = $http.jsonp(constants.FREEBASE_API_URL, {
          params: {
            query: midScore.mid,
            key: constants.API_KEY,
            limit: constants.FREEBASE_API_MAX_RESULTS,
            callback: 'JSON_CALLBACK'
          }
        });
        request.success(function(data) {
          if (data.status == '200 OK') {
            lscache.set(midScore.mid, data, constants.FREEBASE_CACHE_MINUTES);
            processFreebaseResults(data, midScore.score);
          }

          if (midScores.length > 0) {
            translateMidsToTopicNames(midScores);
          } else {
            displayPersonalizedTopics();
          }
        });
      }
    }
  }

  function processFreebaseResults(data, score) {
    if (data.result.length > 0) {
      var result = data.result[0];

      var name = result.name;
      if (result.notable && result.notable.name) {
        name += ' (' + result.notable.name + ')';
      }

      var normalizedScore = score * constants.SCORE_NORMALIZATION_FACTOR;
      if (normalizedScore > constants.MAX_SCORE) {
        normalizedScore = constants.MAX_SCORE;
      }
      if (normalizedScore < constants.MIN_SCORE) {
        normalizedScore = constants.MIN_SCORE;
      }

      $scope.personalizedTopics.push({
        name: name,
        mid: result.mid,
        score: score,
        style: {
          'font-size': normalizedScore + '%',
          opacity: normalizedScore / 100
        }
      });
    }
  }

  function displayPersonalizedTopics() {
    var topicsSortedByScore = $scope.personalizedTopics.sort(function(a, b) {
      return b.score - a.score;
    });

    setTimeout(function() {
      $rootScope.$apply(function() {
        $rootScope.topicResults = topicsSortedByScore;
      });
    }, 1);
  }
}]);