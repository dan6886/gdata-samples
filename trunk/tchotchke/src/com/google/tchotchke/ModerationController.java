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

public class ModerationController {

  private NavigationManager navMan;

  private HttpServletRequest request;

  private DatastoreManager dm;

  private List<VideoSubmission> articleSubmissions;

  private Map<String, List<VideoSubmission>> unmoderatedSubmissions;

  private String nextStart;

  private String prevStart;

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

  private void fetchRecentUnmoderatedSubmissions() {
    unmoderatedSubmissions = dm.getUnmoderatedVideoSubmissions(25);
  }

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

  public boolean hasNextPage() {
    return (nextStart != null);
  }

  public String getNextPageUrl() {
    Map<String, String> params = new HashMap<String, String>();
    params.put("startIndex", nextStart);
    return navMan.getModerationLink(params);
  }

  public boolean hasPrevPage() {
    return (prevStart != null);
  }

  public String getPrevPageUrl() {
    Map<String, String> params = new HashMap<String, String>();
    params.put("startIndex", prevStart);
    return navMan.getModerationLink(params);
  }

  public boolean isArticlePage() {
    return isArticlePage;
  }

}
