package com.google.uploadapp;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;

import javax.activation.MimetypesFileTypeMap;

import sample.util.SimpleCommandLineParser;

import com.google.gdata.client.sites.SitesService;
import com.google.gdata.data.Link;
import com.google.gdata.data.PlainTextConstruct;
import com.google.gdata.data.media.MediaFileSource;
import com.google.gdata.data.sites.AttachmentEntry;
import com.google.gdata.data.sites.ContentFeed;
import com.google.gdata.data.sites.FileCabinetPageEntry;
import com.google.gdata.data.sites.SitesLink;
import com.google.gdata.util.AuthenticationException;
import com.google.gdata.util.ServiceException;

public class UploadApp {

  public MimetypesFileTypeMap mediaTypes;
  private SitesService service;
  private String domain;
  private String siteName;
  
  /**
   * The message for displaying the usage parameters.
   */
  private static final String[] USAGE_MESSAGE = {
      "Usage: java UploadApp.jar --username <user> --password <pass> -- site <siteName>",
      "    [--domain <domain>]     Google Apps domain name (ex. example.com)",
      ""};

  public UploadApp(String applicationName, String domain, String siteName) {
    this.domain = domain;
    this.siteName = siteName;
    service = new SitesService(applicationName);

    // Common mime types
    mediaTypes = new MimetypesFileTypeMap();
    mediaTypes.addMimeTypes("application/msword doc");
    mediaTypes.addMimeTypes("application/vnd.ms-excel xls");
    mediaTypes.addMimeTypes("application/pdf pdf");
    mediaTypes.addMimeTypes("text/richtext rtx");
    mediaTypes.addMimeTypes("text/csv csv");
    mediaTypes.addMimeTypes("text/tab-separated-values tsv tab");
    mediaTypes.addMimeTypes("application/x-vnd.oasis.opendocument.spreadsheet ods");
    mediaTypes.addMimeTypes("application/vnd.oasis.opendocument.text odt");
    mediaTypes.addMimeTypes("application/vnd.ms-powerpoint ppt pps pot");
    mediaTypes.addMimeTypes("application/vnd.openxmlformats-officedocument.wordprocessingml.document docx");
    mediaTypes.addMimeTypes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet xlsx");
    mediaTypes.addMimeTypes("audio/mpeg mp3 mpeg3");
    mediaTypes.addMimeTypes("image/png png");
    mediaTypes.addMimeTypes("application/zip zip");
    mediaTypes.addMimeTypes("application/x-tar tar");
    mediaTypes.addMimeTypes("video/quicktime qt mov moov");
    mediaTypes.addMimeTypes("video/mpeg mpeg mpg mpe mpv vbs mpegv");
    mediaTypes.addMimeTypes("video/msvideo avi");
  }
  
  public String getContentFeedUrl() {
    return "http://sites.google.com/feeds/content/" + domain + "/" + siteName + "/";
  }
  
  public void login(String username, String password) throws AuthenticationException {
    service.setUserCredentials(username, password);
  }
  
  public ContentFeed getFileCabinets() throws MalformedURLException, IOException, ServiceException {
    return service.getFeed(new URL(getContentFeedUrl() + "?kind=filecabinet"), ContentFeed.class);
  }
  
  public AttachmentEntry uploadAttachment(File file, String parentLink, String description)
      throws IOException, ServiceException  {
    String fileMimeType = mediaTypes.getContentType(file);
    
    AttachmentEntry newAttachment = new AttachmentEntry();
    newAttachment.setMediaSource(new MediaFileSource(file, fileMimeType));
    newAttachment.setTitle(new PlainTextConstruct(file.getName()));
    newAttachment.setSummary(new PlainTextConstruct(description));
    newAttachment.addLink(SitesLink.Rel.PARENT, Link.Type.ATOM, parentLink);
    
    return service.insert(new URL(getContentFeedUrl()), newAttachment);
  }
  
  /**
   * Prints out a message.
   *
   * @param msg the message to be printed.
   */
  private static void printMessage(String[] msg) {
    for (String s : msg) {
      System.out.println(s);
    }
  }

  public static void main(String[] args) throws IOException, ServiceException {
    SimpleCommandLineParser parser = new SimpleCommandLineParser(args);
    String username = parser.getValue("username", "user", "u");
    String password = parser.getValue("password", "pass", "p");
    String domain = parser.getValue("domain", "d");
    String site = parser.getValue("site", "s");

    if (domain == null) {
      domain = "site";
    }
    
    if (site == null) {
      System.err.println("Error: No site specified.");
      printMessage(USAGE_MESSAGE);
      return;
    }
    
    if (username == null || password == null) {
      System.err.println("Error: No user email or password specified.");
      printMessage(USAGE_MESSAGE);
      return;
    }

    UploadApp demo = new UploadApp("google-UploadAttachmentSitesApp-v1", domain, site);
    demo.login(username, password);
    
    List<FileCabinetPageEntry> entries = demo.getFileCabinets().getEntries(FileCabinetPageEntry.class);
    System.out.println("Found " + entries.size() + " filecabinets:");
    for (int i = 0; i < entries.size(); ++i) {
      FileCabinetPageEntry entry = entries.get(i);
      System.out.println(" " + (i + 1) + ") " + entry.getTitle().getPlainText() +
          " {" + entry.getPageName().getValue() + "}");
    }
    System.out.println("");
    
    int choice;
    BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
    
    while (true) {
      System.out.print("Upload files to which? ");
      try {
        choice = Integer.parseInt(reader.readLine());
        if (choice > 0 && choice <= entries.size()) {
          break;
        }
      } catch (NumberFormatException e) {
        // retry prompt
      }
      System.err.println("\nError: Please enter a valid choice");
    }
      
    while (true) {
      FileCabinetPageEntry entry = entries.get(choice - 1);

      System.out.print("Enter file to upload: ");
      String filename = reader.readLine();
      
      System.out.print("Enter file description: ");
      String description = reader.readLine();
      
      File file = new File(filename);
      String mediaType = demo.mediaTypes.getContentType(file);
      AttachmentEntry attachment = 
        demo.uploadAttachment(file, entry.getSelfLink().getHref(), description);
      System.out.println("\nFiled uploaded! See it: " +
          attachment.getLink(Link.Rel.ALTERNATE, mediaType).getHref() + "\n");
    }
  }

}
