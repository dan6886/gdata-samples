package com.google.tchotchke;

import java.io.IOException;
import java.util.logging.Logger;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.gdata.data.media.mediarss.MediaCategory;
import com.google.gdata.data.media.mediarss.MediaDescription;
import com.google.gdata.data.media.mediarss.MediaKeywords;
import com.google.gdata.data.media.mediarss.MediaTitle;
import com.google.gdata.data.youtube.FormUploadToken;
import com.google.gdata.data.youtube.VideoEntry;
import com.google.gdata.data.youtube.YouTubeMediaGroup;
import com.google.gdata.data.youtube.YouTubeNamespace;
import com.google.gdata.util.ServiceException;

/**
 * Simple page that handles a redirect from a successful browser-based upload
 * request and then redirects the user back to the display of approved
 * videos for this article.
 * 
 * This page also acts as a POST target when a user submits a video title. In
 * that case, the title is saved to the user's session and a video upload token
 * is returned so they can upload a video file.
 */
@SuppressWarnings("serial")
public class VideoUploadServlet extends HttpServlet {

  private static final Logger log = Logger.getLogger(VideoUploadServlet.class
      .getName());

  @Override
  public void doGet(HttpServletRequest req, HttpServletResponse resp)
      throws IOException {

    SessionManager sessionManager = new SessionManager(req, resp);

    boolean success = handleVideoUpload(sessionManager, req.getParameter("id"),
        req.getParameter("status"), req.getParameter("articleId"));

    if (success) {
      sessionManager.setFlash("upload_notice", "Upload to YouTube succeeded.");
    } else {
      sessionManager.setFlash("upload_notice", "Upload to YouTube Failed.");
    }

    sessionManager.setUploadToken(null, null);
    resp.sendRedirect(sessionManager.getVideoWidgetLink());
  }

  /**
   * Inspect the query parameters to determine how the browser-based
   * upload attempt went.
   * 
   * @param sessionManager The SessionManager for the current user.
   * @param id The video ID of the attempted upload
   * @param status The status of the upload attempt
   * @param articleId The article ID provided by the news site.
   * @return true if the video was able to be successfully uploaded.
   */
  public boolean handleVideoUpload(SessionManager sessionManager, String id,
      String status, String articleId) {
    if (id == null || status == null) {
      log.warning("Getting video response back without id and status");
      return false;
    }

    int status_code = Integer.parseInt(status);
    if (status_code != 200) {
      log.info("Upload failed with code " + status_code);
      return false;
    }

    if (articleId != null) {
      log.info("Upload succeeded for " + id + " on articleId " + articleId);
      DatastoreManager dm = new DatastoreManager();
      if (dm.isVideoIdTaken(id)) {
        log.warning("Video tried to be submitted twice! TWICE!");
        return false;
      }

      dm.addVideoSubmission(id, articleId, sessionManager.getYouTubeUsername(),
          sessionManager.getToken());
      return true;
    } else {
      log.warning("Missing article id on video upload.");
      return false;
    }

  }

  /**
   * Handle getting a video upload token when the user submits a title
   * and description for their response.
   */
  @Override
  public void doPost(HttpServletRequest req, HttpServletResponse resp)
      throws IOException {

    SessionManager sessionManager = new SessionManager(req, resp);

    if (!sessionManager.isLoggedIn()) {
      resp.sendError(HttpServletResponse.SC_FORBIDDEN,
          "Must be authenticated to upload videos.");
      return;
    }

    String title = req.getParameter("title");
    String description = req.getParameter("description");
    String articleId = req.getParameter("articleId");
    String page = req.getParameter("page");

    if (title == null || title.length() == 0) {
      resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Need a video title.");
      return;
    }

    if (articleId == null || page == null) {
      resp.sendError(HttpServletResponse.SC_BAD_REQUEST,
          "Need an articleId and a page.");
    }

    if (title.length() > 100) {
      title = title.substring(0, 99);
    }

    VideoEntry newEntry = new VideoEntry();
    YouTubeMediaGroup mg = newEntry.getOrCreateMediaGroup();

    mg.setTitle(new MediaTitle());
    mg.getTitle().setPlainTextContent(title);

    mg.addCategory(new MediaCategory(YouTubeNamespace.CATEGORY_SCHEME, "News"));
    
    String keyword = System.getProperty("com.google.tchotchke.Keyword");
    if (keyword != null && keyword.length() > 0) {
      mg.setKeywords(new MediaKeywords());
      mg.getKeywords().addKeyword(keyword);
    }
    
    mg.setDescription(new MediaDescription());
    mg.getDescription().setPlainTextContent("Uploaded in response to " + page +
        "\n\n" + description);
    
    String defaultDeveloperTag = System.getProperty(
        "com.google.tchotchke.DefaultDeveloperTag");
    if (defaultDeveloperTag != null && defaultDeveloperTag.length() > 0) {
      mg.addCategory(new MediaCategory(YouTubeNamespace.DEVELOPER_TAG_SCHEME,
          defaultDeveloperTag));
    }
    
    mg.addCategory(new MediaCategory(YouTubeNamespace.DEVELOPER_TAG_SCHEME,
        articleId));

    YouTubeApiManager apiManager = new YouTubeApiManager();
    apiManager.setToken(sessionManager.getToken());

    try {
      // This will make a POST request and obtain an upload token and URL that
      // can be used to submit a new video with the given metadata.
      FormUploadToken token = apiManager.getFormUploadToken(newEntry);
      sessionManager.setUploadToken(token.getToken(), token.getUrl());
      
      resp.sendRedirect(sessionManager.getVideoWidgetLink());
    } catch (ServiceException e) {
      resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
          "Error when attempting to fetch upload token.");
      log.severe("Upload token failed: " + e.toString());
    }
  }
}
