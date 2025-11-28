namespace VideoCall.Application.Interfaces
{
    public interface IInMemoryRepository<out T>
    {
         IReadOnlyList<T> GetAll();
    }
}
