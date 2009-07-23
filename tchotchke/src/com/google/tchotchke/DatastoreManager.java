package com.google.tchotchke;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.logging.Logger;

import javax.jdo.JDOObjectNotFoundException;
import javax.jdo.PersistenceManager;
import javax.jdo.Query;

import com.google.appengine.api.memcache.Expiration;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
import com.google.tchotchke.model.VideoSubmission;
import com.google.tchotchke.model.VideoSubmission.ModerationStatus;

/**
 * Wrapper class for all datastore operations.
 *
 */
public class DatastoreManager {

  // The page size is really 1 larger than you display for pagination
  public static final int DEFAULT_PAGE_SIZE = 11;
  
  private static final Logger log = Logger.getLogger(DatastoreManager.class
      .getName());

  /**
   * Add a new video submission to the datastore.
   * @param videoId The YouTube Video ID
   * @param articleId The News Site Article ID
   * @param uploader The YouTube username of the uploader
   */
  public void addVideoSubmission(String videoId, String articleId,
      String uploader, String authSubToken) {
    PersistenceManager pm = PMF.get().getPersistenceManager();

    try {
      VideoSubmission newSubmission = new VideoSubmission(videoId, articleId,
          uploader, authSubToken);
      newSubmission.save(pm);
    } finally {
      pm.close();
    }

  }
  
  /**
   * Return a specific VideoSubmission entity from the datastore by ID.
   * @param id The id of the desired VideoSubmission.
   * @return The corresponding VideoSubmission object.
   */
  public VideoSubmission getVideoSubmissionById(String id) {
    PersistenceManager pm = PMF.get().getPersistenceManager();
    pm.setDetachAllOnCommit(true);
    try {
      VideoSubmission sub = pm.getObjectById(VideoSubmission.class, "video-" + id);
      return sub;
    } catch(JDOObjectNotFoundException e) {
      return null;
    } finally {
      pm.close();
    }
  }

  /**
   * Check if a video ID has been used before in a submission.
   * @param id YouTube video ID.
   * @return true if the video ID is already in use.
   */
  public boolean isVideoIdTaken(String id) {
    return (getVideoSubmissionById(id) != null);
  }

  /**
   * Fetch the video submissions for an article
   * @param articleId The article ID of the submissions you are interested in.
   * @param limit A limit on how many videos to return.
   * @param moderated true if you only want videos that are approved.
   * @return The entities matching your query
   */
  public List<VideoSubmission> getVideoSubmissionsForArticle(String articleId,
      int limit, boolean moderated) {
    return getVideoSubmissionsForArticle(articleId, limit, moderated, null,
        false);
  }

  /**
   * Fetch the video submissions for an article
   * @param articleId The article ID of the submissions you are interested in.
   * @param limit A limit on how many videos to return.
   * @param moderated true if you only want videos that are approved.
   * @param startIndex A pagination index to start from.
   * @return The entities matching your query
   */
  public List<VideoSubmission> getVideoSubmissionsForArticle(String articleId,
      int limit, boolean moderated, String startIndex) {
    return getVideoSubmissionsForArticle(articleId, limit, moderated,
        startIndex, false);
  }

  /**
   * Fetch the video submissions for an article
   * @param articleId The article ID of the submissions you are interested in.
   * @param limit A limit on how many videos to return.
   * @param moderated true if you only want videos that are approved.
   * @param startIndex A pagination index to start from.
   * @param inverse If the page should look backwards (useful for determining
   *  if there is a previous page of results.)
   * @return The entities matching your query
   */
  @SuppressWarnings("unchecked")
  public List<VideoSubmission> getVideoSubmissionsForArticle(String articleId,
      int limit, boolean moderated, String startIndex, boolean inverse) {

    boolean cacheable = false;
    MemcacheService ms = MemcacheServiceFactory.getMemcacheService();
    String cacheKey = "submissions-" + articleId;

    if (limit == DEFAULT_PAGE_SIZE && startIndex == null && !inverse && moderated) {
      cacheable = true;
      List<VideoSubmission> cached = (List<VideoSubmission>) ms.get(cacheKey);
      if (cached != null) {
        log.info("Cache hit for video submissions");
        return cached;
      }
    }

    PersistenceManager pm = PMF.get().getPersistenceManager();
    pm.setDetachAllOnCommit(true);
    ArrayList<VideoSubmission> submissions = new ArrayList<VideoSubmission>();
    Query query = pm.newQuery(VideoSubmission.class);

    try {
      query.setFilter("articleId == articleParam");
      if (moderated) {
        query.setFilter("status == statusParam");
      }
      if (startIndex != null) {
        if (inverse) {
          query.setFilter("createdIndex > startIndexParam");
        } else {
          query.setFilter("createdIndex <= startIndexParam");
        }
      }

      if (inverse) {
        query.setOrdering("createdIndex asc");
      } else {
        query.setOrdering("createdIndex desc");
      }

      HashMap params = new HashMap();
      params.put("articleParam", articleId);
      StringBuilder paramDec = new StringBuilder("String articleParam");
      
      if (moderated) {
        paramDec.append(", int statusParam");
        params.put("statusParam", VideoSubmission.ModerationStatus.APPROVED.ordinal());
      }
      
      if (startIndex != null) {
        paramDec.append(", String startIndexParam");
        params.put("startIndexParam", startIndex);
      }
      
      query.declareParameters(paramDec.toString());

      query.setRange(0, limit);
      List<VideoSubmission> results;
      results = (List<VideoSubmission>) query.executeWithMap(params);
      for (VideoSubmission submission : results) {
        submissions.add(submission);
      }

    } finally {
      query.closeAll();
      pm.close();
    }

    if (cacheable) {
      int cache_time = Integer.parseInt(System.getProperty(
          "com.google.tchotchke.ArticleSubmissionCacheTime", "60"));
      ms.put(cacheKey, submissions, Expiration.byDeltaSeconds(cache_time));
    }


    return submissions;
  }

  /**
   * Return the next batch of unmoderated video submisisons in any order.
   * @param limit A cap on how many videos to return.
   * @return The unmoderated video submissions grouped by article ID.
   */
  @SuppressWarnings("unchecked")
  public HashMap<String, List<VideoSubmission>> getUnmoderatedVideoSubmissions(
      int limit) {
    PersistenceManager pm = PMF.get().getPersistenceManager();
    pm.setDetachAllOnCommit(true);
    HashMap<String, List<VideoSubmission>> submissions = new HashMap<String, List<VideoSubmission>>();
    Query query = pm.newQuery(VideoSubmission.class);
    query.setFilter("status == statusParam");
    query.setOrdering("articleId desc, createdIndex desc");
    query.declareParameters("int statusParam");
    query.setRange(0, limit);

    try {

      List<VideoSubmission> results = (List<VideoSubmission>) query
          .execute(VideoSubmission.ModerationStatus.UNREVIEWED.ordinal());
      for (VideoSubmission submission : results) {
        if (submissions.containsKey(submission.getArticleId())) {
          submissions.get(submission.getArticleId()).add(submission);
        } else {
          List<VideoSubmission> articleVideos = new ArrayList<VideoSubmission>();
          articleVideos.add(submission);
          submissions.put(submission.getArticleId(), articleVideos);
        }
      }

    } finally {
      query.closeAll();
      pm.close();
    }

    return submissions;

  }

  /**
   * @return All video submissions in the database. Useful for debugging.
   */
  @SuppressWarnings("unchecked")
  public List<VideoSubmission> getAllVideoSubmissions() {
    PersistenceManager pm = PMF.get().getPersistenceManager();
    pm.setDetachAllOnCommit(true);
    ArrayList<VideoSubmission> submissions = new ArrayList<VideoSubmission>();
    Query query = pm.newQuery(VideoSubmission.class);

    try {

      List<VideoSubmission> results = (List<VideoSubmission>) query.execute();
      for (VideoSubmission submission : results) {
        submissions.add(submission);
      }

    } finally {
      query.closeAll();
      pm.close();
    }

    return submissions;

  }

  /**
   * Approve the video.
   * @param videoId YouTube video ID
   */
  public void approveVideo(String videoId) {
    log.severe("Approving video " + videoId);
    moderateVideo(videoId, ModerationStatus.APPROVED);
  }
  
  /**
   * Reject the video.
   * @param videoId YouTube video ID
   */
  public void rejectVideo(String videoId) {
    log.info("Rejecting video " + videoId);
    moderateVideo(videoId, ModerationStatus.REJECTED);
  }
  
  /**
   * Moderate the video to have a new moderation status
   * @param videoId YouTube Video ID
   * @param status The new moderation status.
   */
  public void moderateVideo(String videoId, ModerationStatus status) {
    VideoSubmission sub = getVideoSubmissionById(videoId);
    if(sub != null) {
      sub.setStatus(status);
      sub.save();
      clearMemcacheForArticle(sub.getArticleId());
    } else {
      log.severe("Trying to moderate imaginary submission: " + videoId);
    }
  }
  
  /**
   * Clear out a memcache result page for a particular article. Useful for
   * when a new video is approved for an article.
   * @param articleId The article ID of the article that should have its
   *   memcache cache cleared.
   */
  public void clearMemcacheForArticle(String articleId) {
    MemcacheService ms = MemcacheServiceFactory.getMemcacheService();
    String cacheKey = "submissions-" + articleId;
    ms.delete(cacheKey);
  }
}
