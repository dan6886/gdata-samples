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

/**
 * Model class for a video submission to the system.
 *
 */
@SuppressWarnings("serial")
@PersistenceCapable(identityType = IdentityType.APPLICATION, detachable = "true")
public class VideoSubmission implements Serializable {

  // The default "version" of this model
  private static int DEFAULT_SCHEMA_VERSION = 1;

  // The version of the model - used for upgrading entities if the data model
  // changes.
  @Persistent
  private int SCHEMA_VERSION;

  // The id of the submission is based on the YouTube video ID.
  // A submission is not allowed to be for multiple "articles".
  @PrimaryKey
  private String id;

  @Persistent
  private String videoId;
  
  // The AuthSub token used when uploading this video.
  @Persistent
  private String authSubToken;

  // The article on the news site that this submission belongs to.
  @Persistent
  private String articleId;

  @Persistent
  private Date created;

  // A string index used for pagination in app engine
  @Persistent
  private String createdIndex;

  @Persistent
  private Date updated;

  public enum ModerationStatus {
    UNREVIEWED, APPROVED, REJECTED
  }

  @Persistent
  private int status;

  // YouTube username of the uploader
  @Persistent
  private String uploader;


  /**
   * Create a new video submission entry object for the datastore.
   * 
   * @param videoId The YouTube video ID of the upload
   * @param articleId The news site article ID
   * @param uploader The YouTube username of the uploader
   */
  public VideoSubmission(String videoId, String articleId, String uploader,
      String authSubToken) {
    this.SCHEMA_VERSION = DEFAULT_SCHEMA_VERSION;
    this.id = "video-" + videoId;
    this.videoId = videoId;
    this.authSubToken = authSubToken;
    this.articleId = articleId;
    this.uploader = uploader;
    this.created = new Date();
    SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    df.setTimeZone(TimeZone.getTimeZone("GMT"));
    this.createdIndex = df.format(this.created) + "|" + videoId;
    this.updated = new Date();
    setStatus(ModerationStatus.UNREVIEWED);
  }

  /**
   * Get the moderation status of the video.
   * @return The enumeration value representing this submission's status.
   */
  public ModerationStatus getStatus() {
    return ModerationStatus.values()[status];
  }

 /**
  * Set the moderation status of the video.
  * @param status The new status.
  */
  public void setStatus(ModerationStatus status) {
    this.status = status.ordinal();
  }

  /**
   * Get the YouTube video ID of this submission
   * @return A YouTube video ID
   */
  public String getVideoId() {
    return videoId;
  }
  
  /**
   * Get the AuthSub token associated with this video upload.
   * Unless the token has been revoked or expired (after a year), you should
   * be able to update the related video using this as your credentials.
   * @return A YouTube video ID
   */
  public String getAuthSubToken() {
    return authSubToken;
  }

  /**
   * @return The date and time this submission was created.
   */
  public Date getCreated() {
    return created;
  }

  /**
   * @return The last date and time this submission was modified.
   */
  public Date getUpdated() {
    return updated;
  }

  /**
   * Save this entity to the datastore. 
   * @param pm The PersistanceManager to use when saving. If this is null, then 
   * a new PersistenceManager instace will be manufactured.
   */
  public void save(PersistenceManager pm) {
    this.updated = new Date();
    if(pm == null) {
      pm = PMF.get().getPersistenceManager();
    }
    pm.makePersistent(this);
  }
  
  /**
   * Save this entity to the datastore.
   */
  public void save() {
    save(null);
  }

  /**
   * @return The site-specific article ID to tie this submission to.
   */
  public String getArticleId() {
    return articleId;
  }

  /**
   * Sets the site-specific article ID the submission is tied to.
   * @param articleId The new ID.
   */
  public void setArticleId(String articleId) {
    this.articleId = articleId;
  }

  /**
   * Update the schema version when the model changes.
   * @param version The new version.
   */
  public void setSchemaVersion(int version) {
    this.SCHEMA_VERSION = version;
  }

  /**
   * 
   * @return The current schema version of this entity
   */
  public int getSchemaVersion() {
    return SCHEMA_VERSION;
  }

  /**
   * 
   * @return The ID of this entity
   */
  public String getId() {
    return this.id;
  }

  /**
   * 
   * @return The index value based upon the creation date for this entity.
   */
  public String getCreatedIndex() {
    return this.createdIndex;
  }

  /**
   * 
   * @return The YouTube user who submitted this video.
   */
  public String getUploader() {
    return uploader;
  }

 /**
  * Set the YouTube user who uploaded this video.
  * @param uploader A YouTube username.
  */
  public void setUploader(String uploader) {
    this.uploader = uploader;
  }
}
