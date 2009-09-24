using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Google.GData.Client;
using Google.GData.Extensions;
using System.Xml;

namespace SitesDemo
{
    class SiteEntry : AbstractEntry
    {
        public SiteEntry() : base() {}
    }

    class SitesService : MediaService
    {
        public const string GSitesService = "jotspot";
        public const string SITES_NAMESPACE = "http://schemas.google.com/sites/2008";
        public const string KIND_SCHEME = "http://schemas.google.com/g/2005#kind";
        public const string ATTACHMENT_TERM = SITES_NAMESPACE + "#attachment";
        public const string WEBPAGE_TERM = SITES_NAMESPACE + "#webpage";
        public const string FILECABINET_TERM = SITES_NAMESPACE + "#filecabinet";
        public const string PARENT_REL = SITES_NAMESPACE + "#parent";

        public SitesService(string applicationName) : base(GSitesService, applicationName) {}
    }

    class Program
    {
        static public String APP_NAME = "google-SitesAPIDemo-v1.2";
        static public String DOMAIN = "YOURDOMAIN";
        static public String SITE_NAME = "YOURSITE";
        private SitesService service = null;

        public Program(String username, String password)
        {
            service = new SitesService(APP_NAME);
            service.setUserCredentials(username, password);
        }

        static void Main(string[] args)
        {
            String username = args[0];
            String password = args[1];
            Program demo = new Program(username, password);

            demo.getContentFeed();
            
            //demo.getContentByType("webpage");
            
            //demo.getActivityFeed();
            
            //demo.getRevisionFeed("2461976407633");

            /**
            AtomEntry entry = demo.createWebPage("MyTitle", "<b>something</b>", "custom-path");
            if (entry != null)
            {
                Console.WriteLine(String.Format("Webpage created!  View at {0}", entry.AlternateUri.Content));
            }
            /**/

            /**
            FeedQuery query = new FeedQuery(demo.makeFeedUri("content") + "?kind=filecabinet");
            AtomFeed feed = demo.service.Query(query);
            AtomEntry parent = feed.Entries[0];
            AtomEntry entry = demo.updloadAttachment("C:/Directory/file.pdf", "application/pdf", parent, "MyTitle", "MyDescription");
            if (entry != null)
            {
                Console.WriteLine("Attachment uploaded!");
            }
            /**/

            Console.ReadLine();
        }

        private String makeFeedUri(String type)
        {
            return String.Format("http://sites.google.com/feeds/{0}/{1}/{2}/", type, DOMAIN, SITE_NAME);
        }

        private XmlExtension makePageNameExtension(String pageName)
        {
            XmlDocument xmlDocument = new XmlDocument();
            XmlNode pageNameNode = xmlDocument.CreateNode(XmlNodeType.Element,
              "sites", "pageName", SitesService.SITES_NAMESPACE);
            pageNameNode.InnerText = pageName;
            
            return new XmlExtension(pageNameNode);
        }

        public String getCategoryLabel(AtomCategoryCollection categories)
        {
            foreach (AtomCategory cat in categories)
            {
                if (cat.Scheme == SitesService.KIND_SCHEME)
                {
                    return cat.Label;
                }
            }
            return null;
        }

        public void printContentFeed(AtomFeed feed)
        {
            if (feed.Entries.Count == 0)
            {
                Console.WriteLine("No matching content found.");
            }

            foreach (AtomEntry entry in feed.Entries)
            {
                String pageType = getCategoryLabel(entry.Categories);
                Console.WriteLine(String.Format("Page: {0} ({1})", entry.Title.Text, pageType));
                Console.WriteLine(String.Format("  link: {0}", entry.AlternateUri));
                AtomPersonCollection authors = entry.Authors;
                foreach (AtomPerson author in authors)
                {
                    Console.WriteLine(String.Format("\tauthor: {0} - {1}", author.Name, author.Email));
                }
                String pageContent = entry.Content.Content;
                Console.WriteLine(String.Format("  html: {0}...", pageContent));
            }
        }

        public void getContentFeed()
        {
            getContentFeed(makeFeedUri("content"));
        }

        public void getContentFeed(String feedUri)
        {
            FeedQuery query = new FeedQuery(feedUri);
            AtomFeed feed = service.Query(query);
            printContentFeed(feed);
        }

        public void getContentByType(String type)
        {
            String feedUri = makeFeedUri("content") + String.Format("?kind={2}", type);
            getContentFeed(feedUri);
        }

        public void getActivityFeed()
        {
            getActivityFeed(makeFeedUri("activity"));
        }

        public void getActivityFeed(String feedUri)
        {
            FeedQuery query = new FeedQuery();
            query.Uri = new Uri(feedUri);
            AtomFeed feed = service.Query(query);

            foreach (AtomEntry entry in feed.Entries)
            {
                Console.WriteLine(String.Format("Page: {0}", entry.Title.Text));

                String actionType = getCategoryLabel(entry.Categories);
                Console.WriteLine(String.Format("  {0} on {1}, by {2}", actionType,
                    entry.Updated.ToShortDateString(), entry.Authors[0].Email));
            }
        }

        public void getRevisionFeed(String entryId)
        {
            FeedQuery query = new FeedQuery();
            String feedUri = makeFeedUri("revision") + entryId;
            query.Uri = new Uri(feedUri);
            AtomFeed feed = service.Query(query);


            foreach (AtomEntry entry in feed.Entries)
            {
                XmlExtension revisionNum = (XmlExtension)entry.FindExtension("revision", SitesService.SITES_NAMESPACE);
                Console.WriteLine(String.Format("revision id: {0}", revisionNum.Node.InnerText));
                Console.WriteLine(String.Format("  html: {0}...", entry.Content.Content.Substring(0, 100)));
                Console.WriteLine(String.Format("  site link: {0}", entry.AlternateUri.ToString()));
            }
        }

        public AtomEntry createWebPage(String title, String html, String pageName)
        {
            SiteEntry entry = new SiteEntry();
            AtomCategory category = new AtomCategory(SitesService.WEBPAGE_TERM, SitesService.KIND_SCHEME);
            category.Label = "webpage";
            entry.Categories.Add(category);
            entry.Title.Text = title;
            entry.Content.Type = "xhtml";
            entry.Content.Content = html;
            entry.ExtensionElements.Add(makePageNameExtension(pageName));

            AtomEntry newEntry = null;
            try
            {
                newEntry = service.Insert(new Uri(makeFeedUri("content")), entry);
            }
            catch (GDataRequestException e)
            {
                Console.WriteLine(e.ResponseString);
            }

            return newEntry;
        }

        public AtomEntry updloadAttachment(String filename, String contentType, AtomEntry parent, String title, String description)
        {
            SiteEntry entry = new SiteEntry();

            AtomCategory category = new AtomCategory(SitesService.ATTACHMENT_TERM, SitesService.KIND_SCHEME);
            category.Label = "attachment";
            entry.Categories.Add(category);

            AtomLink parentLink = new AtomLink(AtomLink.ATOM_TYPE, SitesService.PARENT_REL);
            parentLink.HRef = parent.SelfUri;
            entry.Links.Add(parentLink);

            entry.MediaSource = new MediaFileSource(filename, contentType);
            entry.Content.Type = contentType;

            if (title == "")
            {
                entry.Title.Text = entry.MediaSource.Name;
            }
            else
            {
                entry.Title.Text = title;
            }

            entry.Summary.Text = description;

            AtomEntry newEntry = null;
            try
            {
                newEntry = service.Insert(new Uri(makeFeedUri("content")), entry);
            }
            catch (GDataRequestException e)
            {
                Console.WriteLine(e.ResponseString);
            }

            return newEntry;
        }

    }
}
