package com.google.youtube.example.uberactivityviewer;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.apache.log4j.Logger;
import org.json.JSONException;
import org.json.JSONObject;

import com.google.gdata.data.extensions.Rating;
import com.google.gdata.data.youtube.UserEventEntry;
import com.google.gdata.data.youtube.UserEventFeed;

public class DatabaseManager {
  
  private Connection conn;
  private String hostname;
  private String dbName;
  private String username;
  private String password;
  
  private static Logger log = Logger.getLogger(DatabaseManager.class);

  public DatabaseManager(ConfigData config) throws DatabaseException {
    
    this.hostname = config.getDbHostname();
    this.dbName = config.getDbName();
    this.username = config.getDbUsername();
    this.password = config.getDbPassword();
    
    
    try {
      Class.forName("com.mysql.jdbc.Driver").newInstance();
    } catch(Exception e) {
      throw new DatabaseException("Error loading MySQL driver");
    }
    connectToDatabase();
  }
  
  private void connectToDatabase() throws DatabaseException {
    try {
      StringBuilder connectionUrl = new StringBuilder("jdbc:mysql://");
      connectionUrl.append(hostname);
      connectionUrl.append("/").append(dbName);
      conn = DriverManager.getConnection(connectionUrl.toString(), username, password);
    } catch (SQLException e) {
      throw new DatabaseException("Error initializing connection", e);
    }
  }
  
  private void checkConnection() {
    
    Statement stmt = null;
    ResultSet rs = null;
    
    try {
      stmt = conn.createStatement();
      rs = stmt.executeQuery("SELECT id FROM user LIMIT 1");
    } catch (SQLException e) {
      log.debug("Database connection seems borked, recycling it...");
      try {
        conn.close();
      } catch (SQLException e1) { 
        //Do nothing, we just wanted it closed.
      } 
      try {
        connectToDatabase();
      } catch (DatabaseException e2) {
        log.error("Not able to reconnect to database.", e2);
      }
    } finally {
      if(rs != null) {
        try {
          rs.close();
        } catch (SQLException e) { }
        
        rs = null;
      }
      
      if(stmt != null) {
        try {
          stmt.close();
        } catch (SQLException e) { }
      }
    }
  }

  public Map<String, String> getUserMap() throws DatabaseException {
    HashMap<String, String> map = new HashMap<String, String>();
    
    Statement stmt = null;
    ResultSet rs = null;
    
    try {
      checkConnection();
      stmt = conn.createStatement();
      rs = stmt.executeQuery("SELECT * FROM user");
      while(rs.next()) {
        String username = rs.getString("username");
        String hash = rs.getString("hash");
        map.put(hash, username);
      }
      
    } catch (SQLException e) {
      throw new DatabaseException("Error querying for user map", e);
    } finally {
      if(rs != null) {
        try {
          rs.close();
        } catch (SQLException e) { }
        
        rs = null;
      }
      
      if(stmt != null) {
        try {
          stmt.close();
        } catch (SQLException e) { }
      }
    }
    
    
    return map;
  }
  
public String getFeedUpdatedForUser(String username) throws DatabaseException {
    
    PreparedStatement stmt = null;
    ResultSet rs = null;
    String updated = null;
    
    try {
      checkConnection();
      stmt = conn.prepareStatement(
          "SELECT feedUpdated FROM user WHERE username = ?");
      stmt.setString(1, username);
      rs = stmt.executeQuery();
      if(rs.next()) {
        updated = rs.getString("feedUpdated");
      }
      
      if(rs.next()) {
        log.warn("More than one match for username " + username);
      }
      
    } catch (SQLException e) {
      throw new DatabaseException("Error querying for last feed updated", e);
    } finally {
      if(rs != null) {
        try {
          rs.close();
        } catch (SQLException e) { }
        
        rs = null;
      }
      
      if(stmt != null) {
        try {
          stmt.close();
        } catch (SQLException e) { }
      }
    }
    
    return updated;
  }

  public void updateFeedUpdatedForUser(String username, String updated) throws DatabaseException {
    
    PreparedStatement stmt = null;
    
    try {
      checkConnection();
      stmt = conn.prepareStatement(
          "UPDATE user SET feedUpdated = ? WHERE username = ?");
      stmt.setString(1, updated);
      stmt.setString(2, username);
      int rowCount = stmt.executeUpdate();
      
      if(rowCount != 1) {
        log.warn("Wrong number of rows updated with updated for " + username);
      }
      
    } catch (SQLException e) {
      throw new DatabaseException("Error updating user updated time", e);
    } finally {
      
      if(stmt != null) {
        try {
          stmt.close();
        } catch (SQLException e) { }
      }
    }
    
  }

  public String getEtagForUser(String username) throws DatabaseException {
    
    PreparedStatement stmt = null;
    ResultSet rs = null;
    String etag = null;
    
    try {
      checkConnection();
      stmt = conn.prepareStatement(
          "SELECT etag FROM user WHERE username = ?");
      stmt.setString(1, username);
      rs = stmt.executeQuery();
      if(rs.next()) {
        etag = rs.getString("etag");
      }
      
      if(rs.next()) {
        log.warn("More than one match for username " + username);
      }
      
    } catch (SQLException e) {
      throw new DatabaseException("Error querying for user etag", e);
    } finally {
      if(rs != null) {
        try {
          rs.close();
        } catch (SQLException e) { }
        
        rs = null;
      }
      
      if(stmt != null) {
        try {
          stmt.close();
        } catch (SQLException e) { }
      }
    }
    
    return etag;
  }

  public void updateEtagForUser(String username, String etag) throws DatabaseException {
    
    PreparedStatement stmt = null;
    
    try {
      checkConnection();
      stmt = conn.prepareStatement(
          "UPDATE user SET etag = ? WHERE username = ?");
      stmt.setString(1, etag);
      stmt.setString(2, username);
      int rowCount = stmt.executeUpdate();
      
      if(rowCount != 1) {
        log.warn("Wrong number of rows updated with etag for " + username);
      }
      
    } catch (SQLException e) {
      throw new DatabaseException("Error updating user etag", e);
    } finally {
      
      if(stmt != null) {
        try {
          stmt.close();
        } catch (SQLException e) { }
      }
    }
    
  }

  public void updateUserActivities(UserEventFeed activity) throws DatabaseException {
    
    PreparedStatement stmt = null;
    
    try {
      checkConnection();
      stmt = conn.prepareStatement(
          "INSERT IGNORE INTO activity(ytid, username, updated, json) " +
          "VALUES(?, ?, ?, ?)");
      
      for(UserEventEntry event : activity.getEntries()) {
        
        String ytid = event.getId();
        String eventType = event.getUserEventType().toString();
        String author = event.getAuthors().get(0).getName();
        String videoId = event.getVideoId();
        String username = event.getUsername();
        String title = event.getTitle().getPlainText();
        Rating rating = event.getRating();
        Date updated = new Date(event.getUpdated().getValue());
        
        JSONObject json = new JSONObject();
        try {
          json.put("event", eventType);
          json.put("title", title);
          if(username != null) {
            json.put("username", username);
          }
          if(rating != null) {
            json.put("rating", rating.getValue());
          }
          if(videoId != null) {
            json.put("videoid", videoId);
          }
        } catch (JSONException e) {
          log.error("Bad JSON when retrieving event " + ytid + " for user " + username);
          throw new DatabaseException("Error when constructing JSON", e);
        }
        
        
        stmt.setString(1, ytid);
        stmt.setString(2, author);
        stmt.setObject(3, updated);
        stmt.setString(4, json.toString());
        
        stmt.executeUpdate();

      }
      
      
    } catch (SQLException e) {
      throw new DatabaseException("Error inserting user activity", e);
    } finally {
      
      if(stmt != null) {
        try {
          stmt.close();
        } catch (SQLException e) { }
      }
    }
    
    
    
  }

}
