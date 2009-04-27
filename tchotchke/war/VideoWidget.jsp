<%@ page import="org.apache.commons.lang.StringEscapeUtils" %>
<%@ page import="com.google.tchotchke.SessionManager" %>
<%@ page import="com.google.tchotchke.VideoWidgetController" %>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" 
   "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<% 
 SessionManager sessionManager = new SessionManager(request, response);
 VideoWidgetController controller = new VideoWidgetController(request);
  %>
<head>
  <title>Videos!</title>
  <link href="/css/tchotchke.css" rel="stylesheet" type="text/css" />
  <link href="/css/ext/thickbox.css" rel="stylesheet" type="text/css" media="screen">
  <script type="text/javascript" src="/js/ext/jquery-1.3.2.min.js"></script>
  <script type="text/javascript" src="/js/ext/thickbox-compressed.js"></script>
  <script type="text/javascript" src="/js/ext/swfobject.js"></script>
  <script type="text/javascript" src="/js/tchotchke.js"></script>
  <script type="text/javascript">
    function handleSignIn() {
      parent.location = "<%= StringEscapeUtils.escapeJavaScript(sessionManager.getAuthSubLink()) %>";
    }
    var videoList = "<%= StringEscapeUtils.escapeHtml(controller.getVideoSubmissionsAsString()) %>";
    
    ytSyndUploader.LOG_TO_CONSOLE = true;
    ytSyndUploader.renderMultipleVideos(videoList);
  </script>
</head>
<body>
  <div class="syndicated_uploader_main">
    <h1>YouTube Videos For This Article</h1>
    <% if(sessionManager.hasFlash("upload_notice")) { %>
      <p class="notice"><%= StringEscapeUtils.escapeHtml(sessionManager.getFlash("upload_notice")) %></p>
    <% } %>
    <%
      if(!sessionManager.isLoggedIn()) {
    %>
    <h2>Need to log in, bro.</h2>
    <p><a href="javascript:handleSignIn()">click</a></p>
    <%
      } else {
    %>
    <h2>Woah, <%= StringEscapeUtils.escapeHtml(sessionManager.getYouTubeUsername()) %>. You're logged in!</h2>
    <p><%= sessionManager.getToken() %></p>
    <%
      if(sessionManager.isUploadingVideo()) {
    %>
    <form action="<%= StringEscapeUtils.escapeHtml(sessionManager.getVideoUploadPostUrl()) %>" method="post" enctype="multipart/form-data">
      <input type="file" name="file"/>
      <input type="hidden" name="token" value="<%= StringEscapeUtils.escapeHtml(sessionManager.getVideoUploadToken()) %>">
      <input type="submit" value="Upload"/>
    </form>
    <%
      } else {
    %>
    <form action="<%= StringEscapeUtils.escapeHtml(sessionManager.getVideoMetaDataLink()) %>" method="post">
      <input type="text" name="title" value="test"/>
      <input type="submit" value="Submit Video Response"/>
    </form>
    <%
      }
    %>
    <p><a href="<%= StringEscapeUtils.escapeHtml(sessionManager.getLogoutLink()) %>">Logout</a></p>
    <%
      }
    %>
  </div>
  <div id="syndicated_uploader_video_display"></div>
  <div>
  <% if(controller.hasPrevPage()) { %>
    <a href="<%= controller.getPrevPageUrl() %>">Prev</a>
  <% } %>
  <% if(controller.hasNextPage()) { %>
    <a href="<%= controller.getNextPageUrl() %>">Next</a>
  <% } %>
  </div>
</body>
</html>