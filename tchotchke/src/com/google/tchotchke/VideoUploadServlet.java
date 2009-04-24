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

@SuppressWarnings("serial")
public class VideoUploadServlet extends HttpServlet {

  private static final Logger log = Logger.getLogger(VideoUploadServlet.class
      .getName());

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
   * Returns true on success.
   * 
   * @param sessionManager
   * @param id
   * @param status
   * @param articleId
   * @return
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

      dm.addVideoSubmission(id, articleId, sessionManager.getYouTubeUsername());
      return true;
    } else {
      log.warning("Missing article id on video upload.");
      return false;
    }

  }

  public void doPost(HttpServletRequest req, HttpServletResponse resp)
      throws IOException {

    SessionManager sessionManager = new SessionManager(req, resp);

    if (!sessionManager.isLoggedIn()) {
      resp.sendError(HttpServletResponse.SC_FORBIDDEN,
          "Must be authenticated to upload videos.");
      return;
    }

    String title = req.getParameter("title");
    String articleId = req.getParameter("articleId");
    String page = req.getParameter("page");

    if (title == null) {
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
    mg.setKeywords(new MediaKeywords());
    mg.getKeywords().addKeyword("news");
    // TODO: make this tag into a system property.
    mg.getKeywords().addKeyword("tchotchke");
    // TODO: make this a dynamic link
    mg.setDescription(new MediaDescription());
    mg.getDescription().setPlainTextContent("Uploaded via Tchotchke: LINK");
    mg.addCategory(new MediaCategory(YouTubeNamespace.DEVELOPER_TAG_SCHEME,
        "tchotchke"));
    mg.addCategory(new MediaCategory(YouTubeNamespace.DEVELOPER_TAG_SCHEME,
        articleId));

    YouTubeApiManager apiManager = new YouTubeApiManager();
    apiManager.setToken(sessionManager.getToken());

    try {
      FormUploadToken token = apiManager.getFormUploadToken(newEntry);
      sessionManager.setUploadToken(token.getToken(), token.getUrl());
      resp.sendRedirect(sessionManager.getVideoWidgetLink());
    } catch (ServiceException e) {
      resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
          "Error when attempting to fetch upload token.");
      log.severe("Upload token failed: " + e.getMessage());
    }

  }
}
