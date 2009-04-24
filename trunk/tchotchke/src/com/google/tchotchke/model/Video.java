package com.google.tchotchke.model;

import java.util.Date;
import java.util.HashSet;

import javax.jdo.PersistenceManager;
import javax.jdo.annotations.IdentityType;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

import com.google.gdata.data.youtube.VideoEntry;
import com.google.gdata.data.youtube.YouTubeMediaGroup;

@PersistenceCapable(identityType = IdentityType.APPLICATION, detachable = "true")
public class Video {

  private static int DEFAULT_SCHEMA_VERSION = 1;
  
  @Persistent
  private int SCHEMA_VERSION;
  
  @PrimaryKey
  private String id;
  
  @Persistent
  private String videoId;
  
  @Persistent
  private String author;
  
  @Persistent
  private String title;
  
  @Persistent
  private HashSet<String> thumbnails;
  
  @Persistent
  private Date created;
  
  /**
   * @param videoId
   */
  public Video(String videoId) {
    this.id = videoId;
    this.videoId = videoId;
    this.created = new Date();
    this.SCHEMA_VERSION = DEFAULT_SCHEMA_VERSION;
  }
  
  public void parseVideoEntry(VideoEntry entry) {
    
    YouTubeMediaGroup mg = entry.getMediaGroup();
    
    this.title = mg.getTitle().getPlainTextContent();
    this.author = mg.getUploader();
    
  }
  
  public void save(PersistenceManager pm) {
    pm.makePersistent(this);
  }

  public String getId() {
    return id;
  }

  public String getVideoId() {
    return videoId;
  }

  public String getAuthor() {
    return author;
  }

  public String getTitle() {
    return title;
  }

  public HashSet<String> getThumbnails() {
    return thumbnails;
  }

  public Date getCreated() {
    return created;
  }
  
  public void setSchemaVersion(int version) {
    this.SCHEMA_VERSION = version;
  }

  public int getSchemaVersion() {
    return SCHEMA_VERSION;
  }
  
  
  
  
}
