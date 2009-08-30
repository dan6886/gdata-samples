using System;

using System.Windows.Forms;

using Google.GData.Client;
using Google.GData.Documents;

using iTextSharp.text;
using iTextSharp.text.pdf;
using System.IO;

namespace WindowsFormsApplication1
{
    public partial class MainForm : Form
    {
        public const string DOCLIST_FEED_URI = "http://docs.google.com/feeds/default/private/full";
        public const string APP_NAME = "DocListPDFConcatenate";
        private const string TEMP_OUT_FILE = "temp_concat_outfile.pdf"; // Temp file that's written
        public bool loggedIn = false; // Keeps track of our logged in state
        private DocumentsService service; // A connection with the DocList API
        private ListViewItem itemOver = null; // List item user mouse's down on

        public MainForm()
        {
            InitializeComponent();
        }

        /// <summary>
        /// Authenticates to Google servers
        /// </summary>
        /// <param name="username">The user's username (e-mail)</param>
        /// <param name="password">The user's password</param>
        /// <exception cref="AuthenticationException">Thrown on invalid credentials.</exception>
        public void Login(string username, string password)
        {
            if (loggedIn)
            {
                throw new ApplicationException("Already logged in.");
            }
            try
            {
                service = new DocumentsService(APP_NAME);
                GDataGAuthRequestFactory reqFactory = (GDataGAuthRequestFactory)service.RequestFactory;
                reqFactory.KeepAlive = false;
                reqFactory.ProtocolMajor = 3;

                service.setUserCredentials(username, password);

                loggedIn = true;
            }
            catch (AuthenticationException e)
            {
                loggedIn = false;
                service = null;
                throw e;
            }
        }

        /// <summary>
        /// Uploads the file to Google Docs
        /// </summary>
        /// <param name="fileName">The file with path to upload</param>
        /// <param name="documentName">Name to call the uploaded document</param>
        /// <exception cref="ApplicationException">Thrown when user isn't logged in.</exception>
        public DocumentEntry UploadFile(string fileName, string documentName)
        {
            if (!loggedIn)
            {
                throw new ApplicationException("Need to be logged in to upload documents.");
            }
            else
            {
                DocumentEntry entry = null;

                FileInfo fileInfo = new FileInfo(fileName);
                FileStream stream = fileInfo.Open(FileMode.Open, FileAccess.Read, FileShare.ReadWrite);

                try
                {
                    String contentType = (String)DocumentsService.GDocumentsAllowedTypes["PDF"];
                    entry = service.Insert(new Uri(DOCLIST_FEED_URI), stream, contentType, documentName) as DocumentEntry;
                }
                finally
                {
                    stream.Close();
                }

                return entry;
            }
        }

        /// <summary>
        /// Concatenates multiple PDF files together.
        /// </summary>
        /// <param name="outputPDFTitle">The name of the temp file to write</param>
        /// <param name="args">list of files (paths) to concatentate</param>
        public bool ConcatPDFs(string outputPDFTitle, String[] args)
        {
            Document document = new Document();
            try
            {
                int f = 0;
                // we create a reader for a certain document
                PdfReader reader = new PdfReader(args[f]);
                // we retrieve the total number of pages
                int n = reader.NumberOfPages;

                // step 1: creation of a document-object
                document = new Document(reader.GetPageSizeWithRotation(1));

                // step 2: we create a writer that listens to the document
                PdfWriter writer = PdfWriter.GetInstance(document, new FileStream(outputPDFTitle, FileMode.Create));

                // step 3: we open the document
                document.Open();

                PdfContentByte cb = writer.DirectContent;
                PdfImportedPage page;
                int rotation;

                // step 4: we add content
                while (f < args.Length)
                {
                    int i = 0;
                    while (i < n)
                    {
                        i++;
                        document.SetPageSize(reader.GetPageSizeWithRotation(i));
                        document.NewPage();
                        page = writer.GetImportedPage(reader, i);
                        rotation = reader.GetPageRotation(i);
                        if (rotation == 90 || rotation == 270)
                        {
                            cb.AddTemplate(page, 0, -1f, 1f, 0, 0, reader.GetPageSizeWithRotation(i).Height);
                        }
                        else
                        {
                            cb.AddTemplate(page, 1f, 0, 0, 1f, 0, 0);
                        }
                    }
                    f++;
                    if (f < args.Length)
                    {
                        reader = new PdfReader(args[f]);
                        // we retrieve the total number of pages
                        n = reader.NumberOfPages;
                    }
                }

                // step 5: we close the document
                document.Close();

                return true;
            }
            catch (Exception e)
            {
                MessageBox.Show(e.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                if (document.IsOpen())
                {
                    document.Close();
                }
                return false;
            }

        }

        private void loginButton_Click(object sender, EventArgs e)
        {
            if (usernameBox.Text == "")
            {
                MessageBox.Show("Please specify a username", "No user name", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            if (passwordBox.Text == "")
            {
                MessageBox.Show("Please specify a password", "No password", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            try
            {
                loginButton.Text = "Logging in...";
                loginButton.Enabled = false;
                usernameBox.Enabled = false;
                passwordBox.Enabled = false;
                Login(usernameBox.Text, passwordBox.Text);
                if (filelistView.Items.Count > 0)
                {
                    uploadButton.Enabled = true;
                }
                loginButton.Text = "Logged in";
            }
            catch (Exception ex)
            {
                loginButton.Enabled = true;
                usernameBox.Enabled = true;
                passwordBox.Enabled = true;
                loginButton.Text = "Login";
                MessageBox.Show("Error logging into Google Docs: " + ex.Message, "Login Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void usernameBox_KeyPress(object sender, KeyPressEventArgs e)
        {
            // If the user hits enter, skip to the next field.
            if (e.KeyChar == (Char)Keys.Enter)
            {
                passwordBox.Focus();
            }
        }

        private void passwordBox_KeyPress(object sender, KeyPressEventArgs e)
        {
            // If the user hits enter, try to log in.
            if (e.KeyChar == (Char)Keys.Enter)
            {
                loginButton_Click(null, null);
            }
        }

        private void MainForm_DragDrop(object sender, DragEventArgs e)
        {
            if (loggedIn)
            {
                uploadButton.Enabled = true;
            }

            string[] fileList = (string[])e.Data.GetData(DataFormats.FileDrop);

            foreach (string file in fileList)
            {
                try
                {
                    ListViewItem item = new ListViewItem(file);
                    item.Tag = file;
                    filelistView.Items.Add(item);
                    this.Refresh();
                }
                catch (ArgumentException)
                {
                    DialogResult result = MessageBox.Show(
                        String.Format("Error, unable to upload the file: '{0}'. It is not one of the valid types.", file),
                        "Upload Error", MessageBoxButtons.OKCancel, MessageBoxIcon.Error);
                    if (result == DialogResult.Cancel)
                    {
                        return;
                    }
                }
                catch (Exception ex)
                {
                    DialogResult result = MessageBox.Show(
                        String.Format("Error, unable to upload the file: '{0}'. {1}", file, ex.Message),
                        "Upload Error", MessageBoxButtons.OKCancel, MessageBoxIcon.Error);
                    if (result == DialogResult.Cancel)
                    {
                        return;
                    }
                }
            }
        }

        private void MainForm_DragEnter(object sender, DragEventArgs e)
        {
            // If they are dragging a file, let the cursor reflect the operation is permitted.
            if (e.Data.GetDataPresent(DataFormats.FileDrop, false))
            {
                e.Effect = DragDropEffects.Copy;
            }
        }

        private void filelistView_KeyPress(object sender, KeyPressEventArgs e)
        {
            //If the user hits enter, try to log in.
            if (e.KeyChar == (Char)Keys.Delete || e.KeyChar == (Char)Keys.Back)
            {
                foreach (ListViewItem item in filelistView.SelectedItems)
                {
                    item.Remove();
                }
                this.Refresh();

                if (filelistView.Items.Count == 0)
                {
                    uploadButton.Enabled = false;
                }
            }
        }

        private void uploadButton_Click(object sender, EventArgs e)
        {
            if (!loggedIn)
            {
                MessageBox.Show("Please log in before uploading documents", "Upload Error",
                                MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            if (outputPdfTitleBox.Text == "")
            {
                MessageBox.Show("Please specify a title for the output file", "No file title", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            string[] filenames = new string[filelistView.Items.Count];

            if (filenames.Length > 0)
            {
                uploadButton.Text = "Uploading...";
                uploadButton.Enabled = false;


                for (int i = 0; i < filenames.Length; i++)
                {
                    filenames[i] = filelistView.Items[i].Text;
                }

                if (ConcatPDFs(TEMP_OUT_FILE, filenames))
                {
                    DocumentEntry uploadedEntry = UploadFile(TEMP_OUT_FILE, outputPdfTitleBox.Text);
                    MessageBox.Show(uploadedEntry.Title.Text, "Upload successful", MessageBoxButtons.OK);
                }

                File.Delete(TEMP_OUT_FILE);

                uploadButton.Text = "Concatenate PDFs and Upload";
                uploadButton.Enabled = true;
            }
        }

        private void filelistView_MouseDown(object sender, MouseEventArgs e)
        {
            itemOver = filelistView.GetItemAt(0, e.Y);

            if (itemOver != null)
            {
                Cursor = Cursors.Hand;
            }
        }

        private void filelistView_MouseUp(object sender, MouseEventArgs e)
        {
            if (itemOver == null)
            {
                return;
            }

            ListViewItem itemHoveringOver = filelistView.GetItemAt(0, e.Y);

            try
            {
                System.Drawing.Rectangle rc = itemHoveringOver.GetBounds(ItemBoundsPortion.Entire);

                // Find out if we insert before or after the item the mouse is over
                bool insertBefore = false;
                if (e.Y < rc.Top + (rc.Height / 2))
                {
                    insertBefore = true;
                }

                // If we dropped the item on itself, nothing is to be done
                if (itemOver != itemHoveringOver)
                {
                    if (insertBefore)
                    {
                        filelistView.Items.Remove(itemOver);
                        filelistView.Items.Insert(itemHoveringOver.Index, itemOver);
                    }
                    else
                    {
                        filelistView.Items.Remove(itemOver);
                        filelistView.Items.Insert(itemHoveringOver.Index + 1, itemOver);
                    }
                }
            }
            catch (NullReferenceException)
            {
                // Ignore drag outside of box
            }

            Cursor = Cursors.Default;
        }
    }
}
