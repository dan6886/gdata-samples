<%@ page import="org.apache.commons.lang.StringEscapeUtils" %>
<%@ page import="com.google.tchotchke.SessionManager" %>
<%@ page import="com.google.tchotchke.VideoWidgetController" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" 
   "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">

<%
 SessionManager sessionManager = new SessionManager(request, response);
%>

<head>
  <meta HTTP-EQUIV="CACHE-CONTROL" CONTENT="NO-CACHE">
  
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
  </script>
</head>

<body>
  <div class="syndicated_uploader_main">
    <h1>Video Responses - Article <%= sessionManager.getArticleId() %></h1>
    <% if(sessionManager.hasFlash("upload_notice")) { %>
      <p class="notice"><%= StringEscapeUtils.escapeHtml(sessionManager.getFlash("upload_notice")) %></p>
    <% } %>
    <%
      if(!sessionManager.isLoggedIn()) {
    %>
    <h2>Please <a href="javascript:handleSignIn()">log in</a> to YouTube to submit a video response.</h2>
    <%
      } else {
    %>
    <h2>Currently logged in as <%= StringEscapeUtils.escapeHtml(sessionManager.getYouTubeUsername()) %>.</h2>
    <%
      if(sessionManager.isUploadingVideo()) {
    %>
    <form action="<%= StringEscapeUtils.escapeHtml(sessionManager.getVideoUploadPostUrl()) %>" method="post" enctype="multipart/form-data">
      <input type="file" name="file"/>

      <input type="hidden" name="token" value="<%= StringEscapeUtils.escapeHtml(sessionManager.getVideoUploadToken()) %>">
      <input type="hidden" name="articleId" value="<%= request.getParameter("articleId") %>"/>
      <input type="hidden" name="page" value="<%= request.getParameter("page") %>"/>
      
      <input type="submit" value="Upload Video"/>
    </form>
    <%
      } else {
    %>
    <form action="<%= StringEscapeUtils.escapeHtml(sessionManager.getVideoMetaDataLink()) %>" method="post">
      <p>
        <label for="title">Title:</label>
        <input type="text" name="title" id="title"/>
      </p>
      
      <p>
        <label for="description">Description:</label>
        <textarea name="description" id="description"></textarea>
      </p>
      
      <input type="submit" value="Next"/>
    </form>
    <%
      }
    %>
    <p>
      <a href="<%= StringEscapeUtils.escapeHtml(sessionManager.getLogoutLink()) %>">Logout</a>
    </p>
    <%
      }
    %>
  </div>
</body>
</html>