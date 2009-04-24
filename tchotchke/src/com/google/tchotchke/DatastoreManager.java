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

public class DatastoreManager {

  public static final int DEFAULT_PAGE_SIZE = 11;
  
  private static final Logger log = Logger.getLogger(DatastoreManager.class
      .getName());

  public void addVideoSubmission(String videoId, String articleId,
      String uploader) {
    PersistenceManager pm = PMF.get().getPersistenceManager();

    try {
      VideoSubmission newSubmission = new VideoSubmission(videoId, articleId,
          uploader);
      newSubmission.save(pm);

    } finally {
      pm.close();
    }

  }
  
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

  public boolean isVideoIdTaken(String id) {
    return (getVideoSubmissionById(id) != null);
  }

  public List<VideoSubmission> getVideoSubmissionsForArticle(String articleId,
      int limit, boolean moderated) {
    return getVideoSubmissionsForArticle(articleId, limit, moderated, null,
        false);
  }

  public List<VideoSubmission> getVideoSubmissionsForArticle(String articleId,
      int limit, boolean moderated, String startIndex) {
    return getVideoSubmissionsForArticle(articleId, limit, moderated,
        startIndex, false);
  }

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

  public void approveVideo(String videoId) {
    log.severe("Approving video " + videoId);
    moderateVideo(videoId, ModerationStatus.APPROVED);
  }
  
  public void rejectVideo(String videoId) {
    log.info("Rejecting video " + videoId);
    moderateVideo(videoId, ModerationStatus.REJECTED);
  }
  
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
  
  public void clearMemcacheForArticle(String articleId) {
    MemcacheService ms = MemcacheServiceFactory.getMemcacheService();
    String cacheKey = "submissions-" + articleId;
    ms.delete(cacheKey);
  }

}
