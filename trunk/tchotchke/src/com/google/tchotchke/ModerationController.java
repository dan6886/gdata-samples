package com.google.tchotchke;

import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.google.tchotchke.model.VideoSubmission;

/**
 * Controller for the Moderate.jsp page with lots of convenience methods.
 * 
 * If there is an article ID passed through a query parameter - a list of all
 * submissions for a particular article will be shown. Otherwise a list of all
 * unmoderated video submissions will be shown, grouped by article ID.
 */
public class ModerationController {

  private NavigationManager navMan;

  private HttpServletRequest request;

  private DatastoreManager dm;

  private List<VideoSubmission> articleSubmissions;

  //A map of article ID to a list of unmoderated videos for that article.
  private Map<String, List<VideoSubmission>> unmoderatedSubmissions;

  // The start of the next page of query results, if any.
  private String nextStart;

  // The start of the previous page of query results, if any.
  private String prevStart;

  // True if we're looking at all videos for an article, false if we're looking
  // at unmoderated videos for all articles.
  private boolean isArticlePage = false;

  private static final Logger log = Logger.getLogger(ModerationController.class
      .getName());

  public ModerationController(HttpServletRequest req) {
    this.request = req;
    this.navMan = new NavigationManager(req);
    this.dm = new DatastoreManager();

    handleModerationRequest();
    String articleId = request.getParameter("articleId");
    
    if (articleId == null) {
      fetchRecentUnmoderatedSubmissions();
    } else {
      isArticlePage = true;
      fetchVideoSubmissionsForArticle(articleId);
    }
  }

  /**
   * If we get a POST with videoid-FOO=ACTION where FOO is a YouTube video ID
   * and ACTION is one of "APPROVE" or "REJECT", then we will moderate that
   * submission in the datastore accordingly.
   */
  public void handleModerationRequest() {
    for (Enumeration<?> e = request.getParameterNames(); e.hasMoreElements();) {
      String param = (String) e.nextElement();
      if (param.startsWith("videoid-")) {
        String[] parts = param.split("-", 2);
        if (parts.length == 2) {
          String videoId = parts[1];
          String value = request.getParameter(param);
          if (value.equalsIgnoreCase("APPROVE")) {
            dm.approveVideo(videoId);
          } else if (value.equalsIgnoreCase("REJECT")) {
            dm.rejectVideo(videoId);
          }
        }
      }
    }
  }

  /**
   * Retrieves from the datastore all of the video submissions that are tied
   * to a particular article ID.
   * @param articleId The article ID that we want to get videos for.
   */
  private void fetchVideoSubmissionsForArticle(String articleId) {

    String startIndex = request.getParameter("startIndex");

    articleSubmissions = dm.getVideoSubmissionsForArticle(articleId,
        DatastoreManager.DEFAULT_PAGE_SIZE, false, startIndex, false);
    if (articleSubmissions.size() == DatastoreManager.DEFAULT_PAGE_SIZE) {
      nextStart = articleSubmissions.get(articleSubmissions.size() - 1)
          .getCreatedIndex();
    }

    if (startIndex != null) {
      List<VideoSubmission> prevResults = dm.getVideoSubmissionsForArticle(
          articleId, DatastoreManager.DEFAULT_PAGE_SIZE, false, startIndex,
          true);
      if (prevResults.size() > 0) {
        prevStart = prevResults.get(prevResults.size() - 1).getCreatedIndex();
      }
    }
  }

  /**
   * Retrieves from the datastore the next batch of videos to moderate.
   */
  private void fetchRecentUnmoderatedSubmissions() {
    unmoderatedSubmissions = dm.getUnmoderatedVideoSubmissions(25);
  }

  /**
   * Constructs a JSON array of video submissions to pass to jQuery
   * @return the stringified JSON array
   */
  public String getVideoSubmissions() {

    if (isArticlePage) {
      // trim off the last member, it is just there to give us the start index
      // of
      // the next page

      JSONArray json;

      if (articleSubmissions.size() == DatastoreManager.DEFAULT_PAGE_SIZE) {
        json = getArticleJson(articleSubmissions.subList(0, articleSubmissions
            .size() - 2));
      } else {
        json = getArticleJson(articleSubmissions);
      }

      return json.toString();
    } else {
      JSONObject articleObject = new JSONObject();

      for (String articleId : unmoderatedSubmissions.keySet()) {
        try {
          articleObject.put(articleId, getArticleJson(unmoderatedSubmissions
              .get(articleId)));
        } catch (JSONException e) {
          log.severe("Error constructing JSON for article " + articleId);
        }
      }

      return articleObject.toString();
    }
  }

  /**
   * Turns a list of VideoSubmission objects into a JSON array of JSON objects
   * describing each submission.
   * @param subs The list of submissions to transform.
   * @return The JSONArray object transformation.
   */
  public JSONArray getArticleJson(List<VideoSubmission> subs) {
    JSONArray submissionList = new JSONArray();

    for (VideoSubmission sub : subs) {
      JSONObject submissionObject = new JSONObject();
      try {
        submissionObject.put("id", sub.getVideoId());
        submissionObject.put("created", sub.getCreated().toString());
        submissionObject.put("uploader", sub.getUploader());
        submissionObject.put("status", sub.getStatus().toString());
      } catch (JSONException e) {
        log.severe("Invalid JSON produced for video " + sub.getVideoId());
      }
      submissionList.put(submissionObject);
    }

    return submissionList;
  }

  /**
   * 
   * @return True if there is another page of results
   */
  public boolean hasNextPage() {
    return (nextStart != null);
  }

  /**
   * 
   * @return The URL to the next page of results
   */
  public String getNextPageUrl() {
    Map<String, String> params = new HashMap<String, String>();
    params.put("startIndex", nextStart);
    return navMan.getModerationLink(params);
  }

  /**
   * 
   * @return true if there is a previous page of results.
   */
  public boolean hasPrevPage() {
    return (prevStart != null);
  }

  /**
   * 
   * @return The URL to the previous page of results.
   */
  public String getPrevPageUrl() {
    Map<String, String> params = new HashMap<String, String>();
    params.put("startIndex", prevStart);
    return navMan.getModerationLink(params);
  }

  /**
   * 
   * @return true if this page is listing all videos for an article.
   */
  public boolean isArticlePage() {
    return isArticlePage;
  }
}
