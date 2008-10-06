/* Copyright (c) 2006 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author api.eric@google.com (Eric Bidelman)
*/

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using System.Xml;

using System.IO;
using System.Drawing;
using System.Net;

using Google.GData.Client;
using Google.GData.Contacts;
using Google.GData.Extensions;


namespace WpfApplication1
{
    public partial class Window1 : Window
    {    
        // Remember login state
        private bool loggedIn = false;

        // Pagination
        private String nextLink = "";
        private String prevLink = "";
        private String selfLink = "";
        private int selectedIndex = 0;

        // A connection with the Contacts API.
        private ContactsService service;

        // List of contacts
        private ObservableCollection<ContactEntry> contactList = new ObservableCollection<ContactEntry>();

        /// <summary>
        /// Queries the Contacts API and fills the ContactsListBox with the user's contacts.
        /// </summary>
        /// <param name="query">The full URI of a Contacts API query</param>
        /// <returns>Response feed as a ContactsFeed</returns>
        /// <exception cref="GDataRequestException">Thrown on a bad request.</exception>
        private ContactsFeed fillContactList(String query)
        {
            try
            {
                this.contactList.Clear();
                
                ContactsFeed feed = this.service.Query(new ContactsQuery(query));
                foreach (ContactEntry entry in feed.Entries)
                {
                    this.contactList.Add(entry);
                }

                this.selfLink = feed.Self;

                return feed;
            }
            catch(GDataRequestException e)
            {
                throw e;
            }
        }

        public Window1()
        {
            InitializeComponent();
            ContactsListBox.ItemsSource = contactList;

            PreviousButton.IsEnabled = false;
            NextButton.IsEnabled = false;
            SaveButton.IsEnabled = false;
        }

        public ObservableCollection<ContactEntry> ContactItems
        {
            get { return this.contactList; }
            set { this.contactList = value; }
        }

        public string checkNull(string value)
        {
            return value != null ? value : "";
        }

        /// <summary>
        /// Authenticates the user to the Contacts API
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
                this.service = new ContactsService("google-ContactsClientExample-v1.0");
                ((GDataRequestFactory)this.service.RequestFactory).KeepAlive = false;

                this.service.setUserCredentials(username, password);
                this.service.QueryAuthenticationToken();

                
                loggedIn = true;
            }
            catch (AuthenticationException e)
            {
                loggedIn = false;
                this.service = null;
                throw e;
            }
        }

        private void LoginButton_Click(object sender, RoutedEventArgs e)
        {
            if (Username.Text == "")
            {
                MessageBox.Show("Please specify a username", "No user name", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }
            if (Password.Password == "")
            {
                MessageBox.Show("Please specify a password", "No password", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            try
            {
                LoginButton.Content = "Logging in...";
                LoginButton.IsEnabled = false;
                Username.IsEnabled = false;
                Password.IsEnabled = false;

                // Authenticate to the Contacts API
                Login(Username.Text, Password.Password);

                ContactsFeed feed = fillContactList(ContactsQuery.CreateContactsUri("default"));
                
                this.nextLink = feed.NextChunk;
                NextButton.IsEnabled = true;
                SaveButton.IsEnabled = true;
                LoginButton.Content = "Logged In";
            }
            catch (Exception ex)
            {
                LoginButton.IsEnabled = true;
                Username.IsEnabled = true;
                Password.IsEnabled = true;
                SaveButton.IsEnabled = false;
                LoginButton.Content = "Login";
                MessageBox.Show("Error logging in: " + ex.Message, "Login Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void Username_KeyDown(object sender, KeyEventArgs e)
        {
            //If the user hits enter, skip to the next field.
            if (e.Key.ToString() == "Return")
            {
                Password.Focus();
            }
        }

        private void Password_KeyDown(object sender, KeyEventArgs e)
        {
            //If the user hits enter, try to log in.
            if (e.Key.ToString() == "Return")
            {
                LoginButton_Click(null, null);
            }
        }

        private void ContactsListBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (ContactsListBox.SelectedIndex != -1)
            {
                ContactEntry contact = ContactsListBox.SelectedItem as ContactEntry;

                NameTextBox.Text = checkNull(contact.Title.Text);
                DescriptionTextBox.Text = checkNull(contact.Content.Content);
                EmailTextBox.Text = checkNull(contact.PrimaryEmail.Address);
                PhoneTextBox.Text = contact.Phonenumbers.Count > 0 ? contact.Phonenumbers[0].Value : "";
            
                Uri photoUri = contact.PhotoUri;
                if (photoUri != null)  // Set the user's profile image
                {
                    Stream responseStream = this.service.Query(photoUri);
                    JpegBitmapDecoder decoder = new JpegBitmapDecoder(
                        responseStream, BitmapCreateOptions.PreservePixelFormat, BitmapCacheOption.Default);
                    BitmapSource bitmapSource = decoder.Frames[0];
                    ProfileImage.Source = bitmapSource;
                }
                else  // Reset to the default image
                {
                    Bitmap pic = WpfApplication1.Properties.Resources.NoPicImage;              
                    ImageSource wpfBitmap = System.Windows.Interop.Imaging.CreateBitmapSourceFromHBitmap(
                        pic.GetHbitmap(), IntPtr.Zero, Int32Rect.Empty, BitmapSizeOptions.FromEmptyOptions());
                    ProfileImage.Source = wpfBitmap;
                }
            }
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            ContactEntry contact = null;

            if (ContactsListBox.SelectedIndex != -1)
            {
                contact = ContactsListBox.SelectedItem as ContactEntry;

                contact.Title.Text = NameTextBox.Text;
                contact.Content.Content = DescriptionTextBox.Text;

                if (contact.PrimaryEmail == null)
                {
                    EMail email = new EMail(EmailTextBox.Text);
                    email.Primary = true;
                    contact.Emails.Add(email);
                }
                else
                {
                    contact.PrimaryEmail.Address = EmailTextBox.Text;
                }

                if (contact.Phonenumbers.Count > 0)
                {
                    if (PhoneTextBox.Text != "")   // update number
                    {
                        contact.Phonenumbers[0] = new PhoneNumber(PhoneTextBox.Text);
                        contact.Phonenumbers[0].Rel = ContactsRelationships.IsHome;
                    }
                    else
                    {
                        contact.Phonenumbers.Remove(contact.Phonenumbers[0]);   // delete number
                    }
                }
                else if (contact.Phonenumbers.Count == 0 && PhoneTextBox.Text != "") // add new number
                {
                    PhoneNumber phoneNumber = new PhoneNumber(PhoneTextBox.Text);
                    phoneNumber.Rel = ContactsRelationships.IsHome;
                    contact.Phonenumbers.Add(phoneNumber);
                }
            }
        
            try
            {
                contact.Update();

                // Dont't deal with 409 conflict errors. Update the ContactsListBox by querying the feed.
                this.selectedIndex = ContactsListBox.SelectedIndex;
                fillContactList(this.selfLink);
                ContactsListBox.SelectedIndex = this.selectedIndex;
            }
            catch (GDataRequestException ex)
            {
                MessageBox.Show(ex.InnerException.Message);
            }
        }

        private void NextButton_Click(object sender, RoutedEventArgs e)
        {
            ContactsFeed feed = fillContactList(this.nextLink);

            prevLink = feed.PrevChunk;
            if (feed.NextChunk != null)
            {
                this.nextLink = feed.NextChunk;
                PreviousButton.IsEnabled = true;
            }
            else 
            {
                NextButton.IsEnabled = false;
            }
        }

        private void PreviousButton_Click(object sender, RoutedEventArgs e)
        {
            ContactsFeed feed = fillContactList(this.prevLink);

            this.nextLink = feed.NextChunk;
            if (feed.PrevChunk != null)
            {
                this.prevLink = feed.PrevChunk;
                NextButton.IsEnabled = true;
            }
            else
            {
                PreviousButton.IsEnabled = false;
            }
        }
    }
}
