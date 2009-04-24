package com.google.tchotchke.model;

import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.TimeZone;

import javax.jdo.PersistenceManager;
import javax.jdo.annotations.IdentityType;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

import com.google.tchotchke.PMF;

@SuppressWarnings("serial")
@PersistenceCapable(identityType = IdentityType.APPLICATION, detachable = "true")
public class VideoSubmission implements Serializable {

  private static int DEFAULT_SCHEMA_VERSION = 1;

  @Persistent
  private int SCHEMA_VERSION;

  @PrimaryKey
  private String id;

  @Persistent
  private String videoId;

  @Persistent
  private String articleId;

  @Persistent
  private Date created;

  @Persistent
  private String createdIndex;

  @Persistent
  private Date updated;

  public enum ModerationStatus {
    UNREVIEWED, APPROVED, REJECTED
  }

  @Persistent
  private int status;

  @Persistent
  private String uploader;


  /**
   * Create a new video submission entry in the database
   * 
   * @param videoId
   */
  public VideoSubmission(String videoId, String articleId, String uploader) {
    this.SCHEMA_VERSION = DEFAULT_SCHEMA_VERSION;
    this.id = "video-" + videoId;
    this.videoId = videoId;
    this.articleId = articleId;
    this.uploader = uploader;
    this.created = new Date();
    SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    df.setTimeZone(TimeZone.getTimeZone("GMT"));
    this.createdIndex = df.format(this.created) + "|" + videoId;
    this.updated = new Date();
    setStatus(ModerationStatus.UNREVIEWED);
  }


  public ModerationStatus getStatus() {
    return ModerationStatus.values()[status];
  }


  public void setStatus(ModerationStatus status) {
    this.status = status.ordinal();
  }


  public String getVideoId() {
    return videoId;
  }


  public Date getCreated() {
    return created;
  }


  public Date getUpdated() {
    return updated;
  }

  public void save(PersistenceManager pm) {
    this.updated = new Date();
    if(pm == null) {
      pm = PMF.get().getPersistenceManager();
    }
    pm.makePersistent(this);
  }
  
  public void save() {
    save(null);
  }


  public String getArticleId() {
    return articleId;
  }


  public void setArticleId(String articleId) {
    this.articleId = articleId;
  }


  public void setSchemaVersion(int version) {
    this.SCHEMA_VERSION = version;
  }


  public int getSchemaVersion() {
    return SCHEMA_VERSION;
  }

  public String getId() {
    return this.id;
  }

  public String getCreatedIndex() {
    return this.createdIndex;
  }

  public String getUploader() {
    return uploader;
  }


  public void setUploader(String uploader) {
    this.uploader = uploader;
  }



}
