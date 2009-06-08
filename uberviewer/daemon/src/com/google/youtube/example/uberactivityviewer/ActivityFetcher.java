package com.google.youtube.example.uberactivityviewer;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

import org.apache.log4j.Logger;

import com.google.gdata.data.youtube.UserEventFeed;
import com.google.gdata.util.NotModifiedException;

public class ActivityFetcher implements Runnable {

  private static Logger log = Logger.getLogger(ActivityFetcher.class);
  
  private BlockingQueue<String> queue;
  private ConcurrentMap<String, Lock> userLocks;
  
  private DatabaseManager db;
  private ApiManager api;
  
  public ActivityFetcher(ConfigData config, BlockingQueue<String> queue, ConcurrentMap<String, Lock> userLocks) throws DatabaseException {
    this.queue = queue;
    this.userLocks = userLocks;
    this.db = new DatabaseManager(config);
    this.api = new ApiManager(config);
  }

  public void run() {
    
    log.debug("Starting up ActivityFetcher");
    while(true) {
      
      String username;
      
      try {
        username = queue.take();
      } catch (InterruptedException e1) {
        break;
      }
      
      Lock newLock = new ReentrantLock();
      Lock lock = userLocks.putIfAbsent(username, newLock);
      
      if(lock == null) {
        lock = newLock;
      }
      
      if(lock.tryLock()) {
        try {
          log.debug("Retrieving activity for user " + username);
          String etag = db.getEtagForUser(username);
          String updated = db.getFeedUpdatedForUser(username);
          UserEventFeed activity = api.getActivityFeed(username, etag, updated);
          db.updateFeedUpdatedForUser(username, activity.getUpdated().toString());
          db.updateEtagForUser(username, activity.getEtag());
          db.updateUserActivities(activity); 
          log.debug("Retrieved activity for user " + username);
        } catch (ApiException e) {
          log.error("Problem retrieving activity", e);
        } catch (DatabaseException e) {
          log.error("Problem accessing database", e);
        } catch (NotModifiedException e) {
          log.debug("Feed not modified, keep truckin'");
        } finally {
          lock.unlock();
        }
      }
    }
    
    log.debug("ActivityFetcher closing down");

  }

}
