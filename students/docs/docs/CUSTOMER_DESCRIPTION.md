Bây giờ tôi muốn xây dựng 1 cái web như này, web này sẽ phục vụ giáo viên và học sinh, cụ thể trong quá trình làm bài và submit bài IELTS
Mô tả chức năng và nghiệp vụ của trang web như sau:
1: Về phía học sinh
- Nếu bạn biết thì hiện nay sẽ có các trang như STUDY4, IELTS ONLINE TEST, ... hỗ trợ học sinh làm bài thi online. Tôi có mong muốn là trang web của mình cũng có chức năng như vậy. Để làm rõ background hơn thì trang web chỉ phục vụ 1 giao viên duy nhất nhé, giáo viên này quản lý nhiều lớp khác nhau, và các lớp có học sinh riêng. 
- Cụ thể hơn, giáo viên sẽ giao sẵn bài theo lớp, và tất cả học sinh trong lớp đó càn làm bài tập đấy như nhau. Và giáo viên sẽ assign gồm 4 loại bài tập: Nghe Nói Đọc Viết -> 4 kỹ năng IELTS thông thường thôi. Thì lúc này sẽ làm rõ chức năng và nghiệp vụ với từng loại bài
- Listening: Hiển thị đề ở bên trái, và phần điền đáp án ở bên phải. Toàn bộ phần đề hiển thị ở bên trái (cả câu hỏi luôn), còn bên phải chỉ có điền là: Question 01: A Question 02: B ... Question 15: True, ... Question 40: sunflower chẳng hạn. Và có audio sẵn cho học sinh nghe nhé, ý là có audio để bấm play 
- Reading: Tương tự như Listening. 
Note quan trọng: Cả phần lis và read học sinh đều có thể hight light vào đề nhé
- Writing: Hiển thị 1 cái đề và có phần cho hsinh viết bài vào (typing chứ ko upload ảnh)
- Speaking: Có chỗ cho học sinh upload file audio của mình lên

2: Về phía giáo viên
- Giáo viên khi assign bài, ví dụ writing thì có thể tự type đề, speaking cũng thế nhưng reading và listening. Giáo viên cần chuẩn bị sẵn đề, và để tiện thì giáo viên chuẩn bị format txt có sẵn thì sẽ tốt và chuẩn hơn nhỉ? Tuy nhiên cũng nên là cho phép giáo viên chuẩn bị file pdf, thì sẽ có 1 csai api pdf -> txt (optional) vì khuyến khích txt để cho cái phần ở phía hsinh giao diện có thể high light còn dễ thì pdf ko thể highlight dc. Giáo viên sẽ có sẵn kho đề rồi và sẽ chuẩn bị sẵn, tức là có sẵn pool, khi nào assign chỉ việc tick chọn để truy xuất vào và assign thôi
- Giáo viên sẽ assign theo class-level và toàn bộ hsinh trong class đó sẽ cần làm bài đó

3: Về việc chấm, chữa bài
- Reading và Listening thì đơn giản là matching, logic check cơ bản để chấm xem đúng sai như nào , bao nhiêu câu
- Về writing: Học sinh type bài -> submit. Ở phía giáo viên muốn chấm bài k chỉ đơn thuần là chấm điểm và nhận xét rời rạc mà giáo viên có thể chấm theo kiểu như google docs, tức là bôi đen 1 đoạn/câu/components xong rồi type nhận xét riêng cho phần đó. Hoặc là nhận xét tổng thể. Nói chung là kiểu như gg docs và ở phía hsinh sau khi nhận dc bài submit thì cũng thấy dc những cái nhận xét như vậy, thấy rõ hightlight của giáo viên và lời chữa, nâhnj xét của giáo viên cho phần đó hoặc là những lờ nhân xét rời, tổng thể, .... Ở tầng này ngay khi hsinh gửi bài đi (submit) thì đi qua 1 con AI, nó sẽ chấm điểm xem là từ vựng và ngữ pháp hsinh như nào, level bao nhiêu -> đáh giá ngắn và đưa cho gvien xem
- Về seapking, khi hính upload audio, sẽ dùng 1 api text to sciprt -> ở phía gvien hiển thị cả file audio, cho bấm play và hiển thị cả phân text script. Và nếu dc thì giao diện chấm như writing, cũng highlight dc, chấm và nhận xét theo highlight haowjc nhận xét rời được => ở ohias hsinh sau khi nhân dc bài cũng hiển thị rõ ràng vậy. Ở tầng này ngay khi hsinh gửi bài đi (submit) thì đi qua 1 con AI, nó sẽ chấm điểm xem là từ vựng và ngữ pháp hsinh như nào, level bao nhiêu -> đáh giá ngắn và đưa cho gvien xem


Đây là 1 cái web với các yêu cầu cơ bản và đảm bảo đúng mục đích sử dụng. Theo bạn thì có khó triển khai và phức tạp k? Tôi định dùng db và storage cloud rời như cloudflare, .... để lưu trữ như kaf thông tin hsinh, lớp học, .... để sau này triển khia thêm các service khác tách rời repo, chỉ cần init db và connect db rời là dc