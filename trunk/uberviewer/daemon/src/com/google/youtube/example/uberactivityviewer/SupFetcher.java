package com.google.youtube.example.uberactivityviewer;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.BlockingQueue;

import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class SupFetcher implements Runnable {
  
  private static Logger log = Logger.getLogger(SupFetcher.class);
  
  private BlockingQueue<String> queue;
  private DatabaseManager db;
  //the period for the thread to sleep in milliseconds
  private final int SLEEP_TIME = 1000;
  //the frequency with which to retrieve the SUP feed, in seconds
  private final int POLL_FREQUENCY = 150;
  
  private final String supFeedUrl = "http://gdata.youtube.com/sup?seconds=300";
  
  private String lastSupUpdatedTime;

  public SupFetcher(ConfigData config, BlockingQueue<String> queue) throws DatabaseException {
    this.queue = queue;
    this.db = new DatabaseManager(config);
  }

  public void run() {
    log.debug("Starting up SupFetcher");
    
    Date nextRun = new Date();
    
    while(true) {
      Date now = new Date();
      if(now.after(nextRun)) {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.SECOND, POLL_FREQUENCY);
        nextRun = cal.getTime();
        
        log.debug("Fetching SUP feed.");
        
        Map<String, String> userMap;
        try {
          userMap = db.getUserMap();
        } catch (DatabaseException e) {
          log.error("Problem getting user map from DB", e);
          continue;
        }
        
        Map<String, String> supData = getSupFeedData();
        
        //remove all keys that are not being updated right now
        userMap.keySet().retainAll(supData.keySet());
        log.debug("Adding " + userMap.size() + " updates to the queue.");
        queue.addAll(userMap.values());
      } else {
        try {
          Thread.sleep(SLEEP_TIME);
        } catch (InterruptedException e) {
          break;
        }
      }
    }
    
    log.debug("SupFetcher closing down");
  }
  
  public Map<String, String> getSupFeedData() {
    HashMap<String, String> results = new HashMap<String, String>();
    
    try {
      URL feed = new URL(supFeedUrl);
      URLConnection conn = feed.openConnection();
      conn.connect();
      InputStream is = conn.getInputStream();
      BufferedReader br = new BufferedReader(new InputStreamReader(is));
      String line;
      String jsonString = "";
      if((line = br.readLine()) != null) {
        jsonString = jsonString.concat(line);
      }
      JSONObject sup = new JSONObject(jsonString);
      String upTime = sup.getString("updated_time");
      if(lastSupUpdatedTime == null || !lastSupUpdatedTime.equals(upTime)) {
        lastSupUpdatedTime = upTime;
        JSONArray updates = sup.getJSONArray("updates");
        for(int i = 0; i < updates.length(); i++) {
          JSONArray update = updates.getJSONArray(i);
          results.put(update.getString(0), update.getString(1));
        }
      } else {
        log.debug("SUP feed has not been updated since last poll.");
      }
    } catch (MalformedURLException e) {
      log.fatal("Sky is falling! Malformed hard-coded URL!", e);
    } catch (IOException e) {
      log.error("Problems reading SUP feed", e);
    } catch (JSONException e) {
      log.error("Problems parsing SUP JSON", e);
    }
    
    
    return  results;
  }

}
